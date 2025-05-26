from flask import Flask, request, jsonify, render_template, send_from_directory
import openai
from dotenv import load_dotenv
import os
import sqlite3
from datetime import datetime

# Load environment variables
load_dotenv()

# Retrieve the API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY is not set in the .env file")

# Set the OpenAI API key
openai.api_key = api_key

# Define init_db function before using it
def init_db():
    conn = sqlite3.connect('quiz.db')
    c = conn.cursor()
    
    # Create tables for each course
    courses = [
        'computer_technology',
        'tool_and_die',
        'mechatronics',
        'electronics',
        'electricals'
    ]
    
    for course in courses:
        c.execute(f'''
            CREATE TABLE IF NOT EXISTS {course}_leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                score INTEGER NOT NULL,
                difficulty TEXT NOT NULL,
                timestamp DATETIME NOT NULL
            )
        ''')
    
    conn.commit()
    conn.close()

def check_tables():
    conn = sqlite3.connect('quiz.db')
    c = conn.cursor()
    
    c.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%_leaderboard'
    """)
    
    tables = c.fetchall()
    print("Existing tables:", tables)  # Debug print
    
    conn.close()
    return tables

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')

# Initialize database and check tables
init_db()
check_tables()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/result')
def result():
    return render_template('result.html')

@app.route('/get_questions', methods=['POST'])
def get_questions():
    data = request.get_json()
    course = data.get("course", "General")
    difficulty = data.get("difficulty", "easy")

    prompt = (
        f"Generate 10 MCQ questions for the course '{course}' at '{difficulty}' difficulty. "
        f"Each question must have:\n"
        f"- clue (the question)\n"
        f"- options (4 options)\n"
        f"- answer (correct option)\n"
        f"Return ONLY JSON like:\n"
        f"[{{'clue': '...', 'options': ['A', 'B', 'C', 'D'], 'answer': '...'}}, ...]"
    )

    # response = openai.ChatCompletion.create(
    #     model="gpt-3.5-turbo",
    #     messages=[
    #         {"role": "system", "content": "You are a quiz master."},
    #         {"role": "user", "content": prompt}
    #     ]
    # )

    # content = response["choices"][0]["message"]["content"]

    try:
        client = openai.OpenAI()  # Initialize the OpenAI client
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a quiz master."},
                {"role": "user", "content": prompt}
            ]
        )
        content = response.choices[0].message.content
    except Exception as e:
        return jsonify({"error": f"Error communicating with OpenAI: {e}"})

    import json
    try:
        mcqs = json.loads(content)
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse questions from OpenAI."})

    return jsonify({"questions": mcqs})
@app.route('/check_answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    user_answer = data.get("answer", "").lower()
    correct_answer = data.get("correct_answer", "").lower()
    print('result is : ', user_answer == correct_answer)
    return jsonify({"correct": user_answer == correct_answer})

# Optional: serve static files (handled automatically, but explicit route if needed)
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.get_json()
    print(f"Received score submission for course: {data.get('course')}")  # Debug print
    
    # Standardize course names and their table mappings
    course_table_map = {
        'Computer Technology': 'computer_technology',
        'Tool & Die': 'tool_and_die',
        'Tool and Die': 'tool_and_die',  # Alternative format
        'TOOL & DIE': 'tool_and_die',    # Alternative format
        'Mechatronics': 'mechatronics',
        'MECHATRONICS': 'mechatronics',
        'Electronics': 'electronics',
        'ELECTRONICS': 'electronics',
        'Electricals': 'electricals',
        'ELECTRICALS': 'electricals'
    }
    
    course = data.get('course')
    if not course:
        print("No course specified")  # Debug print
        return jsonify({'success': False, 'error': 'No course specified'})
    
    # Try to match the course name case-insensitively
    table_name = None
    course_upper = course.upper()
    for key in course_table_map:
        if key.upper() == course_upper:
            table_name = course_table_map[key]
            break
    
    if not table_name:
        print(f"Invalid course: {course}")  # Debug print
        return jsonify({'success': False, 'error': f'Invalid course: {course}'})
    
    table_name = table_name + '_leaderboard'
    print(f"Inserting score into table: {table_name}")  # Debug print
    
    try:
        conn = sqlite3.connect('quiz.db')
        c = conn.cursor()
        
        c.execute(f'''
            INSERT INTO {table_name} (name, score, difficulty, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (
            data.get('name', 'Anonymous'),
            data.get('score', 0),
            data.get('difficulty', 'easy'),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error submitting score: {e}")  # Debug print
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get_leaderboard')
def get_leaderboard():
    course = request.args.get('course')
    print(f"Fetching leaderboard for course: {course}")  # Debug print
    
    # Use the same standardized course mapping
    course_table_map = {
        'Computer Technology': 'computer_technology',
        'Tool & Die': 'tool_and_die',
        'Tool and Die': 'tool_and_die',  # Alternative format
        'TOOL & DIE': 'tool_and_die',    # Alternative format
        'Mechatronics': 'mechatronics',
        'MECHATRONICS': 'mechatronics',
        'Electronics': 'electronics',
        'ELECTRONICS': 'electronics',
        'Electricals': 'electricals',
        'ELECTRICALS': 'electricals'
    }
    
    if not course:
        course = 'Computer Technology'
        
    # Try to match the course name case-insensitively
    table_name = None
    course_upper = course.upper()
    for key in course_table_map:
        if key.upper() == course_upper:
            table_name = course_table_map[key]
            break
    
    if not table_name:
        print(f"Invalid course name: {course}")  # Debug print
        table_name = 'computer_technology'
    
    table_name = table_name + '_leaderboard'
    print(f"Using table: {table_name}")  # Debug print
    
    try:
        conn = sqlite3.connect('quiz.db')
        c = conn.cursor()
        
        c.execute(f'''
            SELECT name, score, difficulty, timestamp 
            FROM {table_name}
            ORDER BY score DESC, timestamp DESC
            LIMIT 100
        ''')
        
        results = c.fetchall()
        print(f"Found {len(results)} results")  # Debug print
        
        conn.close()
        
        leaderboard_data = [{
            'name': row[0],
            'score': row[1],
            'difficulty': row[2],
            'timestamp': row[3]
        } for row in results]
        
        return jsonify({'success': True, 'leaderboard': leaderboard_data})
    except Exception as e:
        print(f"Error fetching leaderboard: {e}")  # For debugging
        return jsonify({'success': False, 'error': str(e)})

@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')

if __name__ == '__main__':
    app.run(debug=True)
