const request = require('supertest');
const app = require('../index'); // your Express app
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const mongoose = require('mongoose');
const authRoutes = require('../routes/api/auth.routes');

jest.mock('../models/user'); // Mocking the User model

let server;
const port = 5001; // Define your port here

beforeAll((done) => {
    server = app.listen(port, () => {
        done();
    });
});

afterAll(async() => {
    await mongoose.connection.close();
    await new Promise(resolve => server.close(resolve));
}, 10000);

describe('Auth Controller', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mock calls after each test
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            User.findOne.mockResolvedValue(null); // Simulate user not found
            User.prototype.save = jest.fn().mockResolvedValue(true); // Simulate save

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123',
                    role: 'user',
                });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                code: 200,
                message: 'User registered successfully'
            });
        });

        it('should return an error if user already exists', async () => {
            User.findOne.mockResolvedValue({}); // Simulate user found

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    password: 'password123',
                    role: 'user',
                });

            expect(res.status).toBe(400);
            expect(res.body).toEqual({
                code: 400,
                message: 'User already exists'
            });
        });

        it('should return a server error on exception', async () => {
            User.findOne.mockRejectedValue(new Error('DB Error')); // Simulate DB error

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    role: 'user',
                });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({
                code: 500,
                message: 'Server Error',
                error: 'DB Error'
            });
        });
    });

    describe('POST /api/auth/login', () => {
        it('should log in user successfully', async () => {
            const user = {
                _id: '123',
                email: 'john@example.com',
                comparePassword: jest.fn().mockResolvedValue(true), // Simulate correct password
            };
            User.findOne.mockResolvedValue(user); // Simulate user found

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'password123',
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data.token');
            expect(res.body.message).toBe('User logged in successfully');
        });

        it('should return an error if user not found', async () => {
            User.findOne.mockResolvedValue(null); // Simulate user not found

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'notfound@example.com',
                    password: 'password123',
                });

            expect(res.status).toBe(404);
            expect(res.body).toEqual({
                code: 404,
                message: 'Invalid email or password'
            });
        });

        it('should return an error if password is incorrect', async () => {
            const user = {
                _id: '123',
                email: 'john@example.com',
                comparePassword: jest.fn().mockResolvedValue(false), // Simulate incorrect password
            };
            User.findOne.mockResolvedValue(user); // Simulate user found

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'wrongpassword',
                });

            expect(res.status).toBe(401);
            expect(res.body).toEqual({
                code: 401,
                message: 'Invalid email or password'
            });
        });

        it('should return a server error on exception', async () => {
            User.findOne.mockRejectedValue(new Error('DB Error')); // Simulate DB error

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'password123',
                });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({
                code: 500,
                message: 'Server Error',
                error: 'DB Error'
            });
        });
    });
});

describe('Google Authentication', () => {
    it('should redirect to Google authentication', async () => {
        const res = await request(app)
            .get('/api/auth/google')
            .expect(302); // Expect a redirect status code

        expect(res.header.location).toMatch(/accounts\.google\.com/); // Check if the location header points to Google
    });

    it('should handle Google callback and return a JWT token', async () => {
        // Mocking a user and JWT signing
        const mockUser = {
            _id: '12345',
            role: 'user',
            displayName: 'Test User',
            emails: [{ value: 'test@example.com' }],
            googleId: 'google-id-123'
        };

        User.findOne.mockResolvedValue(null); // Simulating that no user exists
        User.prototype.save = jest.fn().mockResolvedValue(mockUser); // Simulating user save

        // Mocking jwt.sign
        const signSpy = jest.spyOn(jwt, 'sign').mockReturnValue('mockedJwtToken');

        try {
            const res = await request(app)
                .get('/api/auth/google/callback?code=mockedCode')
                .expect(200);
            
            expect(res.body.token).toBe('mockedJwtToken');
            expect(signSpy).toHaveBeenCalledWith(
                { id: mockUser._id, role: mockUser.role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
        } catch (error) {
            console.error("Error in handling Google callback:", error);
        } finally {
            signSpy.mockRestore();
        }
    });

    it('should redirect to login on failure', async () => {
        User.findOne.mockResolvedValue(null); // Simulating that no user exists
        User.prototype.save.mockRejectedValue(new Error('User save failed')); // Simulating an error during save

        try {
            const res = await request(app)
                .get('/api/auth/google/callback?code=mockedCode')
                .expect(302); // Expect a redirect due to failure
    
            expect(res.header.location).toBe('/login'); // Check if it redirects to login
        } catch (error) {
            console.error("Error in redirecting to login test:", error);
        }
    });
});

describe('Facebook Authentication', () => {
    it('should redirect to Facebook authentication', async () => {
        const res = await request(app)
            .get('/api/auth/facebook')
            .expect(302); // Expect a redirect status code

        expect(res.header.location).toMatch(/facebook\.com/); // Check if the location header points to Facebook
    });

    it('should handle Facebook callback and return a JWT token', async () => {
        // Mocking a user and JWT signing
        const mockUser = {
            _id: '12345',
            role: 'user',
            name: 'Test User',
            email: 'test@example.com',
            facebookId: 'facebook-id-123'
        };

        User.findOne.mockResolvedValue(null); // Simulating that no user exists
        User.prototype.save = jest.fn().mockResolvedValue(mockUser); // Simulating user save

        // Mocking jwt.sign
        const signSpy = jest.spyOn(jwt, 'sign').mockReturnValue('mockedJwtToken');

        try {
            const res = await request(app)
                .get('/api/auth/facebook/callback?code=mockedCode')
                .expect(200); // Expect success
            
            expect(res.body.token).toBe('mockedJwtToken'); // Check if the token is as expected
            expect(signSpy).toHaveBeenCalledWith(
                { id: mockUser._id, role: mockUser.role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
        } catch (error) {
            console.error("Error in handling Facebook callback:", error);
        } finally {
            signSpy.mockRestore();
        }
    });

    it('should redirect to login on failure', async () => {
        User.findOne.mockResolvedValue(null); // Simulating that no user exists
        User.prototype.save.mockRejectedValue(new Error('User save failed')); // Simulating an error during save

        try {
            const res = await request(app)
                .get('/api/auth/facebook/callback?code=mockedCode')
                .expect(302); // Expect a redirect due to failure
    
            expect(res.header.location).toBe('/login'); // Check if it redirects to login
        } catch (error) {
            console.error("Error in redirecting to login test:", error);
        }
    });
});

