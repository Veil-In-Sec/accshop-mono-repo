--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.faqs (id, question, answer, sort_order) VALUES (1, 'How quickly will I receive my account?', 'All accounts are delivered instantly after your payment has been confirmed. You''ll receive the login credentials in your dashboard.', 0);
INSERT INTO public.faqs (id, question, answer, sort_order) VALUES (2, 'Are these accounts genuine?', 'Yes, every account is created and verified by our team before being listed, so you always receive a fully functional, genuine account.', 1);
INSERT INTO public.faqs (id, question, answer, sort_order) VALUES (3, 'What payment methods do you accept?', 'We accept a wide range of secure payment methods, including mobile banking and crypto. All available options are shown at checkout.', 2);
INSERT INTO public.faqs (id, question, answer, sort_order) VALUES (4, 'What if my account stops working?', 'If an account stops working within the guarantee window, contact our 24/7 support team and we''ll replace it or issue a refund.', 3);


--
-- Data for Name: features; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.features (id, icon, title, description, sort_order) VALUES (1, 'ShieldCheck', 'Secure & Anonymous', 'All accounts are created with privacy in mind. No personal information required.', 0);
INSERT INTO public.features (id, icon, title, description, sort_order) VALUES (2, 'Zap', 'Instant Delivery', 'Get your accounts immediately after purchase. No waiting time.', 1);
INSERT INTO public.features (id, icon, title, description, sort_order) VALUES (3, 'Headset', '24/7 Support', 'Our team is always ready to help you with any questions or issues.', 2);


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.payment_methods (id, name, type, account_number, account_name, instructions, icon, enabled, sort_order, created_at, updated_at) VALUES (1, 'bKash', 'mobile_banking', '01700000000', 'AccShop', 'Send money (not payment) to this bKash Personal number, then submit the transaction ID below.', 'Smartphone', true, 0, '2026-09-24 06:28:08.389', '2026-09-24 06:28:08.389');
INSERT INTO public.payment_methods (id, name, type, account_number, account_name, instructions, icon, enabled, sort_order, created_at, updated_at) VALUES (2, 'Nagad', 'mobile_banking', '01700000001', 'AccShop', 'Send money to this Nagad Personal number, then submit the transaction ID below.', 'Smartphone', true, 1, '2026-09-24 06:28:08.392', '2026-09-24 06:28:08.392');
INSERT INTO public.payment_methods (id, name, type, account_number, account_name, instructions, icon, enabled, sort_order, created_at, updated_at) VALUES (3, 'Rocket', 'mobile_banking', '01700000002', 'AccShop', 'Send money to this Rocket Personal number, then submit the transaction ID below.', 'Smartphone', true, 2, '2026-09-24 06:28:08.394', '2026-09-24 06:28:08.394');
INSERT INTO public.payment_methods (id, name, type, account_number, account_name, instructions, icon, enabled, sort_order, created_at, updated_at) VALUES (4, 'USDT (TRC20)', 'crypto', 'TXaccshopdemoaddress0000000000000', 'AccShop', 'Send USDT (TRC20 network only) to this wallet address, then submit the transaction hash below.', 'Wallet', true, 3, '2026-09-24 06:28:08.395', '2026-09-24 06:28:08.395');


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.site_settings (id, currency_symbol, usd_to_local_rate, fx_live_enabled, min_deposit_usd, min_transfer_amount, initial_balance, site_name, support_url, hero_title, hero_subtitle, footer_text, hotmail_api_key, hotmail_api_base_url, bulkmail_api_key, bulkmail_api_base_url, custom_categories, hero_badge, about_title, about_subtitle, about_heading, about_para1, about_para2, stat1_value, stat1_label, stat2_value, stat2_label, stat3_value, stat3_label, stat4_value, stat4_label, trust_title, trust_desc, trust_bullets, values_title, values_subtitle, features_title, features_subtitle, team_title, team_description, team_stat1_value, team_stat1_label, team_stat2_value, team_stat2_label, team_image_url, testimonials_title, testimonials_subtitle, faq_title, cta_badge, cta_title, cta_subtitle, contact_phone, contact_support_email, contact_sales_email, updated_at) VALUES (1, '৳', 126.850000000000, true, 5.00, 1.00, 0.00, 'AccShop', 'https://t.me/accshop', 'Premium Email Accounts, Delivered Instantly', 'Secure...', 'Providing...', 'a735151e0a7b1d92d07ef9aee7bd18b5', 'https://www.hotmail143.com/api/v1', 'sk_live_37e0532288af8831952a289dc5ca12357a1c6536f2d99ae3a7b733228941cf75', 'https://bulkmail.shop/api/v2/', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-09-24 15:37:29.814');


--
-- Name: faqs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.faqs_id_seq', 7, true);


--
-- Name: features_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.features_id_seq', 6, true);


--
-- Name: payment_methods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_methods_id_seq', 5, true);


--
-- PostgreSQL database dump complete
--


