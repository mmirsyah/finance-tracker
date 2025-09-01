-- 1. Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy that allows users to see their own profile
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING ( true );

-- 3. Create a policy that allows users to insert their own profile
--    The auth.uid() function will match the id of the user making the request
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

-- 4. Create a policy that allows users to update their own profile
CREATE POLICY "Users can update own profile."
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- 5. Grant permissions to the authenticated role
--    Authenticated users can do all operations on their own profile (due to RLS)
GRANT INSERT, SELECT, UPDATE, DELETE ON public.profiles TO authenticated;

-- 6. Grant permissions to the anon role for the sign-up trigger
GRANT INSERT ON public.profiles TO anon;
