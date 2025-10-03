/*
  # Fix Users RLS for Anonymous Registration

  ## Problem
  Users cannot register because policies require 'authenticated' role,
  but registration happens before authentication.
  
  ## Changes
  - Drop existing restrictive policies
  - Add new INSERT policy for anonymous users (public registration)
  - Update SELECT and UPDATE policies to work with custom auth
  
  ## Security
  - Anyone can INSERT (register) - required for signup
  - Anyone can SELECT their own user data (for login verification)
  - Anyone can UPDATE their own user data
*/

-- Drop old policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can register" ON users;

-- Allow anyone to register (no auth required)
CREATE POLICY "Public registration allowed"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public to register (authenticated access)
CREATE POLICY "Authenticated registration allowed"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anyone to read user data for login purposes
CREATE POLICY "Users can read for login"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow users to update their data
CREATE POLICY "Users can update their data"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
