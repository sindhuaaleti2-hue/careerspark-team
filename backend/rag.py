import json

def load_data():
    with open("data.json", "r") as f:
        return json.load(f)

def search_career(query):
    data = load_data()
    results = []

    for career in data["careers"]:
        if query.lower() in career["name"].lower():
            results.append(career)

    return results