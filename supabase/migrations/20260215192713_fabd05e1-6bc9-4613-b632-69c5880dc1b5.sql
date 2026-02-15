
-- Fix: Replace overly permissive ALL policies with specific operation policies

-- credit_packages: drop ALL, add specific
DROP POLICY IF EXISTS "Admins can manage packages" ON public.credit_packages;
CREATE POLICY "Admins can insert packages" ON public.credit_packages FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update packages" ON public.credit_packages FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete packages" ON public.credit_packages FOR DELETE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can select all packages" ON public.credit_packages FOR SELECT USING (public.is_admin(auth.uid()));

-- store_items: drop ALL, add specific
DROP POLICY IF EXISTS "Admins can manage items" ON public.store_items;
CREATE POLICY "Admins can insert items" ON public.store_items FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update items" ON public.store_items FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete items" ON public.store_items FOR DELETE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can select all items" ON public.store_items FOR SELECT USING (public.is_admin(auth.uid()));
