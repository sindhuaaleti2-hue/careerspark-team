
from fastapi.security import OAuth2PasswordBearer
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import json

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, auth
from pydantic import BaseModel

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
# -------------------------------
# Initialize DB tables
# -------------------------------
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# -------------------------------
# CORS for React frontend
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Groq API Client
# -------------------------------
client = Groq(api_key="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")

# -------------------------------
# Load JSON career data
# -------------------------------
def load_data():
    with open("data.json", "r", encoding="utf-8") as f:
        return json.load(f)

data = load_data()

# -------------------------------
# Prepare career documents
# -------------------------------
documents = []
for c in data["careers"]:
    text = f"""
Career: {c['name']}
Category: {c['category']}
Description: {c['description']}
Skills: {', '.join(c.get('skills', []))}
Subjects: {', '.join(c.get('subjects', []))}
Salary: {c.get('salary', '')}
"""
    documents.append(text)

# -------------------------------
# Embeddings + FAISS
# -------------------------------
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)
vectorstore = FAISS.from_texts(documents, embedding_model)

# -------------------------------
# Chat Memory & User State
# -------------------------------
chat_memory = {}
MAX_HISTORY = 6
user_state = {}

# -------------------------------
# Database dependency
# -------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------
# Pydantic model for login/signup
# -------------------------------
class AuthRequest(BaseModel):
    username: str
    password: str
# -------------------------------
# Signup endpoint
# -------------------------------
@app.post("/signup")
def signup(auth_req: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == auth_req.username).first()
    if user:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_pw = auth.hash_password(auth_req.password)

    new_user = models.User(username=auth_req.username, password=hashed_pw)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "Signup successful! You can now login."}


# -------------------------------
# Login endpoint (FIXED)
# -------------------------------
@app.post("/login")
def login(auth_req: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == auth_req.username).first()

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    if not auth.verify_password(auth_req.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = auth.create_access_token({"sub": auth_req.username})

    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Login successful!"
    }


# -------------------------------
# Career search helper
# -------------------------------
def search_careers(query):
    results = []
    for career in data["careers"]:
        if query.lower() in career["name"].lower() or query.lower() in career["category"].lower():
            results.append(career)
    return results

# -------------------------------
# Chat endpoint
# -------------------------------
@app.get("/ask")
def ask(query: str, user_id: str = "default"):
    if user_id not in chat_memory:
        chat_memory[user_id] = []
    if user_id not in user_state:
        user_state[user_id] = {"interest": None}

    query_lower = query.lower()

    if "," in query_lower:
        parts = query_lower.split(",")
        if len(parts) >= 1:
            user_state[user_id]["interest"] = parts[0].strip()

    if query_lower in ["yes", "yeah", "yep"]:
        if user_state[user_id]["interest"]:
            query = f"Give full detailed career guidance including roadmap, salary, colleges, eligibility for {user_state[user_id]['interest']} careers"

    if "career" in query_lower and ("best" in query_lower or "suggest" in query_lower):
        return {
            "response": (
                "I can suggest the best career for you 👇\n\n"
                "Please tell me:\n"
                "1. Your interest (Technology / Medical / Commerce / Government)\n"
                "2. Your education level (10th / 12th / Graduate)\n"
                "3. Your goal (High salary / Government job / Passion)\n"
            )
        }

    docs = vectorstore.similarity_search(query, k=2)
    semantic_context = "\n".join([doc.page_content for doc in docs])

    results = search_careers(query)
    keyword_context = ""
    for c in results:
        keyword_context += f"""
Career: {c['name']}
Category: {c['category']}
Description: {c['description']}
Eligibility: {c['eligibility']}
After 12th Path: {', '.join(c['after_12th_path'])}
Skills: {', '.join(c['skills'])}
Subjects: {', '.join(c['subjects'])}
Exams: {', '.join([e['name'] for e in c['exams']])}
Colleges: {', '.join([col['name'] for col in c['top_colleges']])}
Salary: {c['salary']}
Jobs: {', '.join(c['jobs'])}
Industry Demand: {c['industry_demand']}
Roadmap: {', '.join(c['roadmap'])}
Resources: {', '.join(c['resources'])}
"""

    final_context = semantic_context + "\n" + keyword_context
    history = chat_memory[user_id][-MAX_HISTORY:]

    messages = [
        {
            "role": "system",
            "content": f"""
You are a smart, friendly AI career assistant like ChatGPT.

IMPORTANT RULES:
- Focus on user's selected interest: {user_state[user_id]['interest']}
- Do NOT introduce unrelated careers
- If user says 'yes', continue same topic
- Be natural and conversational
- Give structured answers only when needed
"""
        }
    ]
    messages.extend(history)
    messages.append({
        "role": "user",
        "content": f"""
Context:
{final_context}

User Question:
{query}
"""
    })

    try:
        chat = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile"
        )
        answer = chat.choices[0].message.content
        chat_memory[user_id].append({"role": "user", "content": query})
        chat_memory[user_id].append({"role": "assistant", "content": answer})
        return {"response": answer}
    except Exception as e:
        return {"response": str(e)}

# -------------------------------
# Suggestions endpoint
# -------------------------------
@app.get("/suggestions")
def suggestions():
    return {
        "data": [
            "Best careers after 12th",
            "High salary jobs",
            "How to become Data Scientist",
            "Government jobs after 12th",
            "Careers in AI",
            "Medical career options"
        ]
    }

# -------------------------------
# Root
# -------------------------------
@app.get("/")
def root():
    return {"message": "CareerSpark AI running 🚀 (Memory + Context Fixed)"}