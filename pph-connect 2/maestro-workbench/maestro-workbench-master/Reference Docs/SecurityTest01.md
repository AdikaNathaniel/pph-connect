#Agent instructions:
Essential Instructions for Security Fixes
##Critical Requirements:
Fix ALL high severity issues - these must be resolved to pass
Don't introduce new vulnerabilities while fixing existing ones
Maintain snyk.io coding standards throughout
Follow security best practices for handling sensitive data (URLs, API keys, tokens, etc.)
Test that fixes compile and run without errors

##Context:
Backend is Supabase

Specific Guidance to Include:
#Constraints:
Use environment variables or Supabase client methods appropriately
Don't commit secrets to version control

Testing Checklist:

Test that fixes work as intended
Verify no new errors introduced
Ensure game functionality remains intact
Check that performance isn't significantly degraded

#Results of Code Analysis

##Issue 1: High severity
Hardcoded Non-Cryptographic Secret
    const response = await fetch('https://snkzcosvqewvalounubf.supabase.co/functions/v1/create-root-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3pjb3N2cWV3dmFsb3VudWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTk1NzMsImV4cCI6MjA3NDY7NTU3M30.1P1k0klVS1JyAnHJXfBKvY5RlYE-EmY6UkVZRcFnzhY`
    Avoid hardcoding values that are meant to be secret. Found a hardcoded string used in here.

    ‎src/pages/admin/Setup.tsx

##Issue 2: High Severity
Hardcoded Non-Cryptographic Secret
    import { createClient } from '@supabase/supabase-js';
    import type { Database } from './types';

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://snkzcosvqewvalounubf.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3pjb3N2cWV3dmFsb3VudWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTk1NzMsImV4cCI6MjA3NDY3NTU3M30.1P1k0klVS1JyAnHJXfBKvY5RlYE-EmY6UkVZRcFnzhY";
    Avoid hardcoding values that are meant to be secret. Found a hardcoded string used in here.
    ‎src/integrations/supabase/client.ts

##Issue 3: Medium Severity
Use of Hardcoded Passwords
                  'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNua3pjb3N2cWV3dmFsb3VudWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTk1NzMsImV4cCI6MjA3NDY7NTU3M30.1P1k0klVS1JyAnHJXfBKvY5RlYE-EmY6UkVZRcFnzhY`
        },
        body: JSON.stringify({
          email: 'maximsto@me.com',
          password: '31rTH+9W',
    Do not hardcode passwords in code. Found hardcoded password used in password.
        ‎src/pages/admin/Setup.tsx

##Issue 4: Medium Severity
Use of Hardcoded Passwords
          body: {
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        password: 'TempPass654!!'
    Do not hardcode passwords in code. Found hardcoded password used in password.
    ‎src/pages/manager/UserManagement.tsx

##Issue 5: Medium Severity
    Use of Hardcoded Passwords
              body: {
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
            password: 'TempPass654!!'
    Do not hardcode passwords in code. Found hardcoded password used in password.
    ‎src/pages/manager/UserManagement.tsx


##Issue 6: Low Severity
Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
            _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    Cookie misses the Secure attribute (it is false by default). Set it to true to protect the cookie from man-in-the-middle attacks.
    ‎src/components/ui/sidebar.tsx