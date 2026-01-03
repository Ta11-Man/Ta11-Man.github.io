import requests
import json
import datetime
import os

# CONFIGURATION
# ---------------------------------------------------------
USERNAME = "Ta11-Man" 
TOKEN = os.environ.get("GITHUB_TOKEN") # Best practice: load from environment variable
OUTPUT_FILE = "data.json"
YEARS_TO_FETCH = [ 2023, 2024, 2025, 2026] # Adjust years as needed
# ---------------------------------------------------------

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

def run_query(query, variables):
    request = requests.post('https://api.github.com/graphql', json={'query': query, 'variables': variables}, headers=HEADERS)
    if request.status_code == 200:
        return request.json()
    else:
        raise Exception(f"Query failed to run by returning code of {request.status_code}. {query}")

def get_contributions_for_year(year):
    # GraphQL query to get the daily contribution count for a specific year
    query = """
    query($userName: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $userName) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
    """
    
    # Define date range for the requested year
    variables = {
        "userName": USERNAME,
        "from": f"{year}-01-01T00:00:00Z",
        "to": f"{year}-12-31T23:59:59Z"
    }
    
    result = run_query(query, variables)
    calendar = result['data']['user']['contributionsCollection']['contributionCalendar']
    
    # Flatten the weeks -> days structure
    daily_commits = []
    for week in calendar['weeks']:
        for day in week['contributionDays']:
            daily_commits.append({
                "date": day['date'],
                "count": day['contributionCount']
            })
            
    return daily_commits

def get_public_repos():
    # Query to fetch first 100 public repos
    query = """
    query($userName: String!) {
      user(login: $userName) {
        repositories(first: 100, privacy: PUBLIC, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            name
            primaryLanguage {
              name
            }
          }
        }
      }
    }
    """
    variables = {"userName": USERNAME}
    result = run_query(query, variables)
    
    repos_data = []
    nodes = result['data']['user']['repositories']['nodes']
    
    for repo in nodes:
        lang = "Unknown"
        if repo['primaryLanguage']:
            lang = repo['primaryLanguage']['name']
            
        repos_data.append({
            "extension": repo['name'],
            "language": lang
        })
        
    return repos_data

def main():
    final_data = {
        "gitCommits": [],
        "publicRepos": []
    }

    print(f"Fetching data for user: {USERNAME}")

    # 1. Fetch Commits per Year
    for year in YEARS_TO_FETCH:
        print(f"Processing year {year}...")
        try:
            commits_list = get_contributions_for_year(year)
            final_data["gitCommits"].append({
                "year": str(year),
                "commits": commits_list
            })
        except Exception as e:
            print(f"Error fetching {year}: {e}")

    # 2. Fetch Public Repos
    print("Fetching repositories...")
    final_data["publicRepos"] = get_public_repos()

    # 3. Write to JSON
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final_data, f, indent=2)
    
    print(f"Successfully wrote data to {OUTPUT_FILE}")

def get_user_stats():
    query = """
    query($userName: String!) {
      user(login: $userName) {
        # Get Total PRs
        pullRequests(states: MERGED) {
          totalCount
        }
        # Get Repos and their Star Counts
        repositories(first: 100, privacy: PUBLIC, isFork: false) {
          nodes {
            stargazerCount
            primaryLanguage {
              name
            }
          }
        }
      }
    }
    """
    variables = {"userName": USERNAME}
    result = run_query(query, variables)
    
    user_data = result['data']['user']
    total_prs = user_data['pullRequests']['totalCount']
    
    # Calculate Total Stars
    total_stars = 0
    for repo in user_data['repositories']['nodes']:
        total_stars += repo['stargazerCount']

    return {
        "totalPRs": total_prs,
        "totalStars": total_stars
    }

if __name__ == "__main__":
    main()