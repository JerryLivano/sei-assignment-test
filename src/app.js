const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../view/pages'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: '1234567890',
    resave: true,
    saveUninitialized: true
}));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'user_management',
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    }
    console.log('Connected to MySQL');

    app.use(bodyParser.json());

    app.get('/', (req, res) => {
        res.redirect('login');
    });

    app.get('/login', (req, res) => {
        res.render('login');
    });

    app.post('/login', (req, res) => {
        const { username, password } = req.body;
        const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
        db.query(query, [username, password], (error, results) => {
            if (error) {
                console.error('Error during login:', error);
            }
            if (results.length > 0) {
                const user = results[0];
                req.session.user = {
                    username: user.username,
                    name: user.name,
                    email: user.email,
                };
                res.redirect('/user');
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        });
    });

    app.get('/user', (req, res) => {
        if (req.session.user) {
            const query = 'SELECT userid, username, name, email FROM users';
            db.query(query, (error, results) => {
                if (error) {
                    console.error('Error fetching user data:', error);
                }
                res.render('user', { users: results, session_user: req.session.user });
            });
        } else {
            res.redirect('/login');
        }
    });

    app.get('/add-user', (req, res) => {
        if (req.session.user) {
            res.render('add_user');
        } else {
            res.redirect('/login');
        }
    });

    app.post('/user', (req, res) => {
        const { name, username, email, password, confPassword } = req.body;

        const usernameCheckQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(usernameCheckQuery, [username], (usernameError, usernameResults) => {
            if (usernameError) {
                console.error('Error inserting user:', usernameError);
            } else if (usernameResults.length > 0) {
                res.status(400).send('Username already in use');
            } else {
                const emailCheckQuery = 'SELECT * FROM users WHERE email = ?';
                db.query(emailCheckQuery, [email], (emailError, emailResults) => {
                    if (emailError) {
                        console.error('Error inserting user:', emailError);
                    } else if (emailResults.length > 0) {
                        res.status(400).send('Email already in use');
                    } else {
                        if (password === confPassword) {
                            const insertQuery = 'INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)';
                            db.query(insertQuery, [name, username, email, password], (error) => {
                                if (error) {
                                    console.error('Error inserting user:', error);
                                } else {
                                    res.redirect('/user');
                                }
                            });
                        } else {
                            res.status(400).send('Passwords do not match');
                        }
                    }
                });
            }
        });
    });

    app.get('/user/delete/:userId', (req, res) => {
        const userId = req.params.userId;

        const deleteQuery = 'DELETE FROM users WHERE userid = ?';
        db.query(deleteQuery, userId, (error) => {
            if (error) {
                console.error('Error deleting user:', error);
            }
            res.redirect('/user');
        });
    });

    app.get('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error during logout:', err);
            }
            res.redirect('/login');
        });
    });

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
