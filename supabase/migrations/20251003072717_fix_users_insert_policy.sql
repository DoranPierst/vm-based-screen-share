/*
  # Fix Users Table RLS Policy

  ## Problem
  Users table has RLS enabled but missing INSERT policy for public registration.
  
  ## Changes
  - Add INSERT policy to allow anyone to register (create new user)
  - Keep existing SELECT and UPDATE policies for authenticated users only
  
  ## Security
  - Anyone can INSERT (register) - required for signup
  - Only authenticated users can SELECT their own data
  - Only authenticated users can UPDATE their own data
*/

-- Allow anyone to register (INSERT new users)
CREATE POLICY "Anyone can register"
  ON users FOR INSERT
  WITH CHECK (true);
