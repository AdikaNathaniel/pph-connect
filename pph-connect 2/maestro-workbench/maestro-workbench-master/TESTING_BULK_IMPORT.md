# Testing CSV Bulk Import Feature

## Overview
This feature allows managers to pre-provision OAuth users by uploading a CSV file containing email addresses.

## Test Steps

### 1. **Prepare Test CSV**
Use the included `sample_users.csv` or create your own:

```csv
email
john.doe@yourcompany.com
jane.smith@yourcompany.com
bob.johnson@yourcompany.com
```

**Important:** Make sure these are valid Google Workspace emails from your organization.

### 2. **Upload CSV (Manager Dashboard)**

1. Sign in as a **manager** or **root** user
2. Navigate to: **User Management** (`/m/users`)
3. Scroll to the **"Bulk Import from CSV (OAuth Users)"** section
4. Click **Choose File** and select your CSV
5. Click **Upload & Process**

**Expected Results:**
- Progress indicator shows while processing
- Success toast: "Bulk import complete! X created, Y skipped, Z errors"
- Results table shows status for each email:
  - ✅ **Created** (green) - User pre-provisioned successfully
  - ⚠️ **Skipped** (yellow) - User already exists
  - ❌ **Error** (red) - Invalid email or other error

### 3. **Verify Pre-Provisioned Users (Database)**

Check the `pre_provisioned_users` table:

```sql
SELECT * FROM pre_provisioned_users ORDER BY created_at DESC;
```

**Expected:**
- New rows for each uploaded email
- `role` = 'worker'
- `department_id` = (Default Department ID)
- `provisioned_by` = (Your manager user ID)

### 4. **Test OAuth Sign-In (Pre-Provisioned User)**

1. Open an **incognito/private browser window**
2. Go to the app landing page
3. Click **"Continue with Google"**
4. Sign in with one of the pre-provisioned emails
5. Complete OAuth flow

**Expected Results:**
- User successfully signs in
- Toast message: "Welcome to Maestro! Your **worker** account has been created successfully."
- User is redirected to worker dashboard (`/w/dashboard`)
- Profile created with:
  - Role: **worker**
  - Department: **Default Department**
  - Email: (from pre-provisioned list)

**Verify in Database:**
```sql
-- Check profiles table
SELECT id, email, role, department_id FROM profiles WHERE email = 'test.user1@yourcompany.com';

-- Check pre_provisioned_users table (should be empty for that email)
SELECT * FROM pre_provisioned_users WHERE email = 'test.user1@yourcompany.com';
```

The user should now be in `profiles` but **deleted** from `pre_provisioned_users`.

### 5. **Test OAuth Sign-In (Non-Pre-Provisioned User)**

1. Open an **incognito/private browser window**
2. Go to the app landing page
3. Click **"Continue with Google"**
4. Sign in with an email **NOT** in the CSV (but still from your organization)
5. Complete OAuth flow

**Expected Results:**
- User successfully signs in
- Toast message: "Welcome to Maestro! Your **worker** account has been created successfully."
- User is assigned **worker** role by default
- User is assigned to **Default Department**

### 6. **Test Duplicate Upload**

1. Upload the same CSV again
2. Click **Upload & Process**

**Expected Results:**
- All emails show as **"Skipped - Already pre-provisioned"** or **"Skipped - User already has active profile"**
- No new records created

### 7. **Test Invalid CSV**

Test these edge cases:

**Missing header:**
```csv
john.doe@company.com
jane.smith@company.com
```
**Expected:** Error: "CSV must have an 'email' column"

**Invalid emails:**
```csv
email
not-an-email
john@
@company.com
```
**Expected:** Each invalid email shows as **Error - Invalid email format**

**Empty file:**
```csv
email
```
**Expected:** Error: "No valid emails found in CSV"

## Cleanup After Testing

To remove test users:

```sql
-- Delete from profiles
DELETE FROM profiles WHERE email LIKE '%@yourcompany.com';

-- Delete from pre_provisioned_users
DELETE FROM pre_provisioned_users WHERE email LIKE '%@yourcompany.com';
```

Or use the **User Management UI** to delete users individually.

## Success Criteria

✅ CSV upload accepts valid files
✅ Invalid CSVs show clear error messages
✅ Pre-provisioned users are created with worker role + default department
✅ OAuth sign-in links to pre-provisioned profile
✅ Non-pre-provisioned users still work (default worker)
✅ Duplicate emails are skipped gracefully
✅ Results summary is clear and accurate

## Troubleshooting

### Issue: "Forbidden: Only root and managers can provision users"
**Solution:** Make sure you're signed in as a manager or root user.

### Issue: "Default Department not found"
**Solution:** Run the setup migration:
```bash
supabase db push
```

### Issue: OAuth user created as worker instead of pre-provisioned role
**Solution:** Check `pre_provisioned_users` table - the email might not match exactly (case-sensitive).

### Issue: CSV upload shows all errors
**Solution:** Check the browser console for detailed error messages.
