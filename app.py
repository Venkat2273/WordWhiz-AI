from flask import Flask, request, jsonify, render_template, send_from_directory
import openai
from dotenv import load_dotenv
import os
import sqlite3
from datetime import datetime
from contextlib import contextmanager
import time

# Load environment variables
load_dotenv()

# Retrieve the API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY is not set in the .env file")

# Set the OpenAI API key
openai.api_key = api_key

# Define the database connection context manager first
@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = sqlite3.connect('ss.db', timeout=20)
        conn.row_factory = sqlite3.Row
        print("Database connection established successfully")
        yield conn
    except sqlite3.Error as e:
        print(f"Database connection error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            try:
                conn.close()
                print("Database connection closed")
            except Exception as e:
                print(f"Error closing connection: {e}")

def init_db():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Create tables for each course with proper table names
            courses = {
                'Computer Technology': 'computer_technology',
                'Tool & Die': 'tool_and_die',
                'Mechatronics': 'mechatronics',
                'Electronics': 'electronics',
                'Electricals': 'electricals'
            }
            
            for display_name, table_name in courses.items():
                table_name = f"{table_name}_leaderboard"
                # Only create the table if it doesn't exist
                cursor.execute(f'''
                    CREATE TABLE IF NOT EXISTS {table_name} (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        score INTEGER NOT NULL,
                        difficulty TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
            
            conn.commit()
            print("Database tables verified/created successfully")
            return True
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        return False

def verify_database():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            if not tables:
                print("No tables found in database, reinitializing...")
                return init_db()
            print(f"Existing tables: {tables}")
            return True
    except Exception as e:
        print(f"Error verifying database: {str(e)}")
        return False

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')

# Initialize database and verify setup
if not verify_database():
    print("Failed to initialize database!")
    raise RuntimeError("Database initialization failed")

def check_tables():
    conn = sqlite3.connect('dev.db')  # Changed from 'quiz.db' to 'dev.db'
    c = conn.cursor()
    
    c.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%_leaderboard'
    """)
    
    tables = c.fetchall()
    print("Existing tables:", tables)  # Debug print
    
    conn.close()
    return tables

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

# Add these imports at the top if not already present
from contextlib import contextmanager
import time

@app.route('/submit_score', methods=['POST'])
def submit_score():
    try:
        data = request.get_json()
        print(f"Received score submission: {data}")
        
        # Check for required fields
        if not all(key in data for key in ['name', 'score', 'course', 'difficulty']):
            print(f"Missing required fields in data: {data}")
            return jsonify({'success': False, 'error': 'Missing required fields'})
        
        # Ensure name is not empty
        name = data.get('name', '').strip() or 'Anonymous'
        print(f"Using name: {name}")
        
        # Standardize course names
        course_table_map = {
            'Computer Technology': 'computer_technology',
            'Tool & Die': 'tool_and_die',
            'Tool and Die': 'tool_and_die',
            'Mechatronics': 'mechatronics',
            'Electronics': 'electronics',
            'Electricals': 'electricals'
        }
        
        course = data['course'].strip()
        table_name = course_table_map.get(course)
        
        if not table_name:
            print(f"Invalid course name: {course}")
            return jsonify({'success': False, 'error': f'Invalid course: {course}'})
        
        table_name = f"{table_name}_leaderboard"
        print(f"Using table name: {table_name}")
        
        # Validate score
        try:
            score = int(data['score'])
            if score < 0 or score > 100:
                return jsonify({'success': False, 'error': 'Invalid score value'})
        except ValueError:
            return jsonify({'success': False, 'error': 'Score must be a number'})
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verify table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                print(f"Table {table_name} does not exist!")
                # Create the table if it doesn't exist
                cursor.execute(f'''
                    CREATE TABLE {table_name} (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        score INTEGER NOT NULL,
                        difficulty TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                conn.commit()
                print(f"Created table {table_name}")
            
            try:
                # Insert the score with explicit name
                insert_query = f'''
                    INSERT INTO {table_name} (name, score, difficulty, timestamp)
                    VALUES (?, ?, ?, datetime('now'))
                '''
                
                values = (name, score, data['difficulty'])
                
                print(f"Executing query: {insert_query} with values: {values}")
                cursor.execute(insert_query, values)
                
                # Commit the transaction
                conn.commit()
                print(f"Successfully inserted score for {name}")
                return jsonify({'success': True})
                    
            except Exception as e:
                print(f"Database error during insert: {str(e)}")
                return jsonify({'success': False, 'error': f'Failed to save score: {str(e)}'})
                
    except Exception as e:
        print(f"Error in submit_score: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get_leaderboard')
def get_leaderboard():
    course = request.args.get('course')
    print(f"Fetching leaderboard for course: {course}")
    
    course_table_map = {
        'Computer Technology': 'computer_technology',
        'Tool & Die': 'tool_and_die',
        'Tool and Die': 'tool_and_die',
        'Mechatronics': 'mechatronics',
        'Electronics': 'electronics',
        'Electricals': 'electricals'
    }
    
    table_name = course_table_map.get(course)
    if not table_name:
        print(f"Invalid course name: {course}")
        return jsonify({'success': False, 'error': f'Invalid course: {course}'})
    
    table_name = f"{table_name}_leaderboard"
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verify table exists
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                print(f"Table {table_name} does not exist!")
                return jsonify({'success': False, 'error': 'Database table not found'})
            
            cursor.execute(f'''
                SELECT name, score, difficulty, timestamp 
                FROM {table_name}
                ORDER BY score DESC, timestamp DESC
                LIMIT 100
            ''')
            
            results = cursor.fetchall()
            print(f"Found {len(results)} results for {course}")
            
            leaderboard_data = [{
                'name': row[0],
                'score': row[1],
                'difficulty': row[2],
                'timestamp': row[3]
            } for row in results]
            
            return jsonify({'success': True, 'leaderboard': leaderboard_data})
    except sqlite3.Error as e:
        print(f"Database error in get_leaderboard: {str(e)}")
        return jsonify({'success': False, 'error': 'Database error'})
    except Exception as e:
        print(f"Error in get_leaderboard: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')

@app.route('/feedback')
def feedback():
    return render_template('feedback.html')

@app.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        print(f"Received feedback submission: {data}")
        
        # Check for required fields
        if not all(key in data for key in ['name', 'rating', 'feedback']):
            print(f"Missing required fields in data: {data}")
            return jsonify({'success': False, 'error': 'Missing required fields'})
        
        # Ensure name is not empty
        name = data.get('name', '').strip() or 'Anonymous'
        
        # Validate rating
        try:
            rating = int(data['rating'])
            if rating < 1 or rating > 5:
                return jsonify({'success': False, 'error': 'Invalid rating value'})
        except ValueError:
            return jsonify({'success': False, 'error': 'Rating must be a number'})
        
        # Use the connection context manager
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Insert the feedback
            insert_query = '''
                INSERT INTO feedback (name, rating, feedback, timestamp)
                VALUES (?, ?, ?, datetime('now'))
            '''
            
            values = (name, rating, data['feedback'])
            
            print(f"Executing query: {insert_query} with values: {values}")
            cursor.execute(insert_query, values)
            
            print(f"Successfully inserted feedback from {name}")
            return jsonify({'success': True})
                
    except Exception as e:
        print(f"Error in submit_feedback: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

# Add this new function to initialize the feedback database
def init_feedback_db():
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Create feedback table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    feedback TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            print("Feedback database initialized successfully")
            return True
    except Exception as e:
        print(f"Error initializing feedback database: {str(e)}")
        return False

# Initialize feedback database
init_feedback_db()
if __name__ == '__main__':
    app.run(debug=True)
 