from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/')
def login_page():
    return render_template('login.html')  # HTML goes in templates folder

@app.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']
    # Validate credentials here
    return f"Welcome, {email}!"

if __name__ == '__main__':
    app.run(debug=True)
