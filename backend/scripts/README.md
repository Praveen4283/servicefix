# Test Scripts

This directory contains scripts for testing various aspects of the backend functionality.

## Profile API Tests

We provide two test scripts to verify the profile data fetching and updating functionality:

### 1. Automated Test (test-profile.js)

This script automatically logs in using provided test credentials and then tests the profile workflow.

#### Setup:

1. Make sure your backend server is running:
   ```
   npm run dev
   ```

2. Edit the `TEST_USER` object in the script to use valid test credentials:
   ```javascript
   // Test user credentials - replace with valid test credentials
   const TEST_USER = {
     email: 'test@example.com', // Update with a valid test user email
     password: 'password123'     // Update with the correct password
   };
   ```

3. Run the script:
   ```
   node scripts/test-profile.js
   ```

### 2. Manual Test with JWT Token (test-profile-manual.js)

This script skips the login step and uses a JWT token you provide. This is useful if you're having trouble with the login flow or want to test with a specific user session.

#### Setup:

1. Make sure your backend server is running:
   ```
   npm run dev
   ```

2. Get a valid JWT token:
   - Log in to your app in a browser
   - Open browser dev tools (F12)
   - Go to Application tab > Local Storage > your site
   - Copy the 'authToken' value

3. Edit the script to add your JWT token:
   ```javascript
   // IMPORTANT: Replace with a valid JWT token from your browser
   const AUTH_TOKEN = 'your.jwt.token.here';
   ```

4. Update the USER_ID if needed (it should match the user associated with your token):
   ```javascript
   // The user ID to test
   const USER_ID = '645fa2eb-abf0-4488-b493-934aec7e577d';
   ```

5. Run the script:
   ```
   node scripts/test-profile-manual.js
   ```

## Test Progress and Results

Both scripts provide detailed output of each step in the testing process:

1. Login (automated script only)
2. Fetching the original profile data
3. Updating the profile with test data
4. Verifying the update was successful
5. Restoring the original profile data

At the end of the test, you'll see a summary of the results:

```
📊 Test Results:
Login: ✅ PASS
Fetch Profile: ✅ PASS
Update Profile: ✅ PASS
Verify Update: ✅ PASS
Restore Original: ✅ PASS

✅✅✅ ALL TESTS PASSED! The profile functionality is working perfectly.
```

If any test fails, you'll see details about what went wrong and potential fixes.

## Troubleshooting

### Login Failures
- Verify the test user credentials are correct
- Ensure the user exists in your database
- Check that the user account is not locked

### JWT Token Issues
- Make sure the token is recent and not expired
- Confirm you copied the entire token without missing characters
- Verify the user ID matches the token's user

### API Connection Issues
- Ensure your backend server is running
- Check the server port in the script matches your backend
- Look for CORS issues if testing from a different domain 