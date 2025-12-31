


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."community_topic" AS ENUM (
    'introductions',
    'projects',
    'collaboration'
);


ALTER TYPE "public"."community_topic" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text" DEFAULT NULL::"text", "p_reference_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.users
  SET total_points = total_points + p_points,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  INSERT INTO public.points_transactions (user_id, points, action, description, reference_id)
  VALUES (p_user_id, p_points, p_action, p_description, p_reference_id);
END;
$$;


ALTER FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text", "p_reference_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_points"("user_identifier" "text", "points" integer, "action" "text", "description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  uid UUID;
BEGIN
  -- Convert text to UUID if possible
  uid := user_identifier::UUID;

  -- Insert into transactions table
  INSERT INTO points_transactions (user_id, points, action, description, created_at)
  VALUES (uid, points, action, description, NOW());

  -- Update user's total points
  UPDATE users
  SET total_points = COALESCE(total_points, 0) + points
  WHERE id = uid;
END;
$$;


ALTER FUNCTION "public"."award_points"("user_identifier" "text", "points" integer, "action" "text", "description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1️⃣ Insert a record into your points log (if table exists)
  INSERT INTO points_transactions (
    user_id,
    points,
    action,
    description,
    created_at
  ) VALUES (
    p_user_id,
    p_points,
    p_action,
    p_description,
    NOW()
  );

  -- 2️⃣ Update user's total points (if column exists)
  UPDATE users
  SET total_points = COALESCE(total_points, 0) + p_points
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.community_threads
    set likes_count = likes_count + 1,
        updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."bump_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_replies_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.community_threads
    set replies_count = replies_count + 1,
        updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."bump_replies_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_reputation_score"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_upload_count INTEGER;
  v_review_count INTEGER;
  v_verified_count INTEGER;
  v_avg_quality NUMERIC;
  v_reputation INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_upload_count
  FROM public.datasets
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COUNT(*) INTO v_review_count
  FROM public.reviews
  WHERE reviewer_id = p_user_id AND status = 'active';
  
  SELECT COUNT(*) INTO v_verified_count
  FROM public.datasets
  WHERE user_id = p_user_id AND verification_status = 'verified';
  
  SELECT COALESCE(AVG(final_score), 0) INTO v_avg_quality
  FROM public.datasets
  WHERE user_id = p_user_id AND final_score IS NOT NULL;
  
  v_reputation := (v_verified_count * 50) + 
                  (v_upload_count * 10) + 
                  (v_review_count * 5) + 
                  COALESCE(v_avg_quality::INTEGER, 0);
  
  RETURN v_reputation;
END;
$$;


ALTER FUNCTION "public"."calculate_reputation_score"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.community_threads
    set likes_count = greatest(likes_count - 1, 0),
        updated_at = now()
    where id = old.thread_id;
  return old;
end;
$$;


ALTER FUNCTION "public"."decrement_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_replies_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.community_threads
    set replies_count = greatest(replies_count - 1, 0),
        updated_at = now()
    where id = old.thread_id;
  return old;
end;
$$;


ALTER FUNCTION "public"."decrement_replies_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    total_points,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    100,
    NOW(),
    NOW()
  );
  
  INSERT INTO public.points_transactions (
    user_id, 
    points, 
    action, 
    description,
    created_at
  )
  VALUES (
    NEW.id, 
    100, 
    'signup', 
    'Welcome bonus',
    NOW()
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_dataset_insert_reward"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform award_points(new.uploader_id, 10, 'upload', 'Dataset upload reward');
  return new;
end;
$$;


ALTER FUNCTION "public"."on_dataset_insert_reward"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_review_insert_reward"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform award_points(new.reviewer_id, 20, 'review', 'Peer review reward');
  return new;
end;
$$;


ALTER FUNCTION "public"."on_review_insert_reward"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_dataset_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_dataset_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."citations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dataset_id" "uuid" NOT NULL,
    "citing_user_id" "uuid" NOT NULL,
    "citation_text" "text" NOT NULL,
    "publication_title" "text",
    "publication_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."citations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_reactions" (
    "thread_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_replies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "thread_id" "uuid",
    "user_id" "uuid",
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_threads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "topic" "public"."community_topic" NOT NULL,
    "replies_count" integer DEFAULT 0 NOT NULL,
    "likes_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."datasets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "research_field" "text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "contributor_name" "text",
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "ai_confidence_score" integer,
    "ai_quality_score" integer,
    "ai_issues" "text"[] DEFAULT '{}'::"text"[],
    "ai_suggestions" "text"[] DEFAULT '{}'::"text"[],
    "ai_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "review_count" integer DEFAULT 0 NOT NULL,
    "final_score" integer,
    "verification_status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "is_free" boolean DEFAULT true NOT NULL,
    "price_usd" numeric(10,2) DEFAULT 0,
    "view_count" integer DEFAULT 0 NOT NULL,
    "download_count" integer DEFAULT 0 NOT NULL,
    "citation_count" integer DEFAULT 0 NOT NULL,
    "share_count" integer DEFAULT 0 NOT NULL,
    "share_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text"),
    "is_public" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    "ai_analysis" "jsonb",
    "ai_verified_at" timestamp with time zone,
    "column_count" integer,
    "row_count" integer,
    "human_verification_score" numeric,
    "final_verification_score" numeric,
    "is_verified" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "share_link" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "ipfs_hash" "text",
    "total_reviews" "text",
    "uploader_id" "text",
    CONSTRAINT "datasets_ai_confidence_check" CHECK ((("ai_confidence_score" >= 0) AND ("ai_confidence_score" <= 100))),
    CONSTRAINT "datasets_ai_quality_score_check" CHECK ((("ai_quality_score" >= 0) AND ("ai_quality_score" <= 100))),
    CONSTRAINT "datasets_final_score_check" CHECK ((("final_score" >= 0) AND ("final_score" <= 100))),
    CONSTRAINT "datasets_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'ai_verified'::"text", 'under_review'::"text", 'verified'::"text", 'rejected'::"text"]))),
    CONSTRAINT "datasets_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['pending_review'::"text", 'verified'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."datasets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."downloads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dataset_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "download_token" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."downloads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "action" "text" NOT NULL,
    "description" "text",
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text",
    CONSTRAINT "points_transactions_action_check" CHECK (("action" = ANY (ARRAY['signup'::"text", 'upload'::"text", 'review'::"text", 'verification'::"text", 'citation'::"text", 'referral'::"text", 'bonus'::"text", 'penalty'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."points_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dataset_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "accuracy_rating" integer NOT NULL,
    "completeness_rating" integer NOT NULL,
    "relevance_rating" integer NOT NULL,
    "methodology_rating" integer NOT NULL,
    "human_score" integer NOT NULL,
    "feedback" "text",
    "recommendation" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_accuracy_rating_check" CHECK ((("accuracy_rating" >= 1) AND ("accuracy_rating" <= 5))),
    CONSTRAINT "reviews_completeness_rating_check" CHECK ((("completeness_rating" >= 1) AND ("completeness_rating" <= 5))),
    CONSTRAINT "reviews_human_score_check" CHECK ((("human_score" >= 0) AND ("human_score" <= 100))),
    CONSTRAINT "reviews_methodology_rating_check" CHECK ((("methodology_rating" >= 1) AND ("methodology_rating" <= 5))),
    CONSTRAINT "reviews_recommendation_check" CHECK (("recommendation" = ANY (ARRAY['approve'::"text", 'reject'::"text", 'needs_improvement'::"text"]))),
    CONSTRAINT "reviews_relevance_rating_check" CHECK ((("relevance_rating" >= 1) AND ("relevance_rating" <= 5))),
    CONSTRAINT "reviews_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'flagged'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "wallet_address" "text",
    "total_points" integer DEFAULT 100 NOT NULL,
    "reputation_score" integer DEFAULT 0 NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "affiliation" "text",
    "research_interests" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "wallet_address" "text" NOT NULL,
    "amount" bigint NOT NULL,
    "token_symbol" "text" DEFAULT 'ARB'::"text" NOT NULL,
    "tx_signature" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "direction" "text" DEFAULT 'out'::"text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    "error_message" "text"
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."citations"
    ADD CONSTRAINT "citations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_reactions"
    ADD CONSTRAINT "community_reactions_pkey" PRIMARY KEY ("thread_id", "user_id");



ALTER TABLE ONLY "public"."community_replies"
    ADD CONSTRAINT "community_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_threads"
    ADD CONSTRAINT "community_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."downloads"
    ADD CONSTRAINT "downloads_download_token_key" UNIQUE ("download_token");



ALTER TABLE ONLY "public"."downloads"
    ADD CONSTRAINT "downloads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_unique_reviewer_per_dataset" UNIQUE ("dataset_id", "reviewer_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "community_replies_thread_created_idx" ON "public"."community_replies" USING "btree" ("thread_id", "created_at" DESC);



CREATE INDEX "community_threads_topic_created_idx" ON "public"."community_threads" USING "btree" ("topic", "created_at" DESC);



CREATE INDEX "idx_citations_dataset_id" ON "public"."citations" USING "btree" ("dataset_id");



CREATE INDEX "idx_datasets_created_at" ON "public"."datasets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_datasets_final_score" ON "public"."datasets" USING "btree" ("final_score" DESC NULLS LAST);



CREATE INDEX "idx_datasets_research_field" ON "public"."datasets" USING "btree" ("research_field");



CREATE INDEX "idx_datasets_share_token" ON "public"."datasets" USING "btree" ("share_token");



CREATE INDEX "idx_datasets_status" ON "public"."datasets" USING "btree" ("status");



CREATE INDEX "idx_datasets_user_id" ON "public"."datasets" USING "btree" ("user_id");



CREATE INDEX "idx_datasets_verification_status" ON "public"."datasets" USING "btree" ("verification_status");



CREATE INDEX "idx_downloads_dataset_id" ON "public"."downloads" USING "btree" ("dataset_id");



CREATE INDEX "idx_points_action" ON "public"."points_transactions" USING "btree" ("action");



CREATE INDEX "idx_points_created_at" ON "public"."points_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_points_user_id" ON "public"."points_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_created_at" ON "public"."reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reviews_dataset_id" ON "public"."reviews" USING "btree" ("dataset_id");



CREATE INDEX "idx_reviews_reviewer_id" ON "public"."reviews" USING "btree" ("reviewer_id");



CREATE INDEX "wallet_transactions_user_created_idx" ON "public"."wallet_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "dataset_upload_reward" AFTER INSERT ON "public"."datasets" FOR EACH ROW EXECUTE FUNCTION "public"."on_dataset_insert_reward"();



CREATE OR REPLACE TRIGGER "review_reward_trigger" AFTER INSERT ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."on_review_insert_reward"();



CREATE OR REPLACE TRIGGER "trg_likes_dec" AFTER DELETE ON "public"."community_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_likes_count"();



CREATE OR REPLACE TRIGGER "trg_likes_inc" AFTER INSERT ON "public"."community_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."bump_likes_count"();



CREATE OR REPLACE TRIGGER "trg_replies_dec" AFTER DELETE ON "public"."community_replies" FOR EACH ROW EXECUTE FUNCTION "public"."decrement_replies_count"();



CREATE OR REPLACE TRIGGER "trg_replies_inc" AFTER INSERT ON "public"."community_replies" FOR EACH ROW EXECUTE FUNCTION "public"."bump_replies_count"();



CREATE OR REPLACE TRIGGER "update_dataset_timestamp" BEFORE UPDATE ON "public"."datasets" FOR EACH ROW EXECUTE FUNCTION "public"."update_dataset_timestamp"();



CREATE OR REPLACE TRIGGER "update_datasets_updated_at" BEFORE UPDATE ON "public"."datasets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."citations"
    ADD CONSTRAINT "citations_citing_user_id_fkey" FOREIGN KEY ("citing_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."citations"
    ADD CONSTRAINT "citations_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_reactions"
    ADD CONSTRAINT "community_reactions_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."community_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_reactions"
    ADD CONSTRAINT "community_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_replies"
    ADD CONSTRAINT "community_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."community_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_replies"
    ADD CONSTRAINT "community_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_threads"
    ADD CONSTRAINT "community_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."datasets"
    ADD CONSTRAINT "datasets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."downloads"
    ADD CONSTRAINT "downloads_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."downloads"
    ADD CONSTRAINT "downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can insert datasets" ON "public"."datasets" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"())::"text" = "uploader_id"));



CREATE POLICY "Public can view public datasets" ON "public"."datasets" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Users can delete their own datasets" ON "public"."datasets" FOR DELETE TO "authenticated" USING ((("auth"."uid"())::"text" = "uploader_id"));



CREATE POLICY "Users can update their own datasets" ON "public"."datasets" FOR UPDATE TO "authenticated" USING ((("auth"."uid"())::"text" = "uploader_id")) WITH CHECK ((("auth"."uid"())::"text" = "uploader_id"));



CREATE POLICY "allow_public_read_active_datasets" ON "public"."datasets" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "allow_public_read_citations" ON "public"."citations" FOR SELECT USING (true);



CREATE POLICY "allow_public_read_downloads" ON "public"."downloads" FOR SELECT USING (true);



CREATE POLICY "allow_public_read_reviews" ON "public"."reviews" FOR SELECT USING (("status" = 'active'::"text"));



CREATE POLICY "allow_public_read_users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "allow_reviewer_update_own" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "allow_service_insert_downloads" ON "public"."downloads" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_service_insert_points" ON "public"."points_transactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_service_insert_users" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_user_delete_own_dataset" ON "public"."datasets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_user_insert_citation" ON "public"."citations" FOR INSERT WITH CHECK (("auth"."uid"() = "citing_user_id"));



CREATE POLICY "allow_user_insert_own_dataset" ON "public"."datasets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_user_insert_review" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "reviewer_id"));



CREATE POLICY "allow_user_read_own_points" ON "public"."points_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_user_update_own" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "allow_user_update_own_dataset" ON "public"."datasets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."citations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."datasets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."downloads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."points_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reactions delete own" ON "public"."community_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "reactions insert by authed" ON "public"."community_reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "reactions readable by all" ON "public"."community_reactions" FOR SELECT USING (true);



CREATE POLICY "replies delete own" ON "public"."community_replies" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "replies insert by authed" ON "public"."community_replies" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "replies readable by all" ON "public"."community_replies" FOR SELECT USING (true);



CREATE POLICY "replies update own" ON "public"."community_replies" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "threads insert by authed" ON "public"."community_threads" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "threads readable by all" ON "public"."community_threads" FOR SELECT USING (true);



CREATE POLICY "threads update own" ON "public"."community_threads" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text", "p_reference_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text", "p_reference_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text", "p_reference_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."award_points"("user_identifier" "text", "points" integer, "action" "text", "description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."award_points"("user_identifier" "text", "points" integer, "action" "text", "description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_points"("user_identifier" "text", "points" integer, "action" "text", "description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_points"("p_user_id" "uuid", "p_points" integer, "p_action" "text", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."bump_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bump_replies_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."bump_replies_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_replies_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_reputation_score"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_reputation_score"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_reputation_score"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_replies_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_replies_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_replies_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_dataset_insert_reward"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_dataset_insert_reward"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_dataset_insert_reward"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_review_insert_reward"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_review_insert_reward"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_review_insert_reward"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_dataset_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_dataset_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_dataset_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."citations" TO "anon";
GRANT ALL ON TABLE "public"."citations" TO "authenticated";
GRANT ALL ON TABLE "public"."citations" TO "service_role";



GRANT ALL ON TABLE "public"."community_reactions" TO "anon";
GRANT ALL ON TABLE "public"."community_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."community_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."community_replies" TO "anon";
GRANT ALL ON TABLE "public"."community_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."community_replies" TO "service_role";



GRANT ALL ON TABLE "public"."community_threads" TO "anon";
GRANT ALL ON TABLE "public"."community_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."community_threads" TO "service_role";



GRANT ALL ON TABLE "public"."datasets" TO "anon";
GRANT ALL ON TABLE "public"."datasets" TO "authenticated";
GRANT ALL ON TABLE "public"."datasets" TO "service_role";



GRANT ALL ON TABLE "public"."downloads" TO "anon";
GRANT ALL ON TABLE "public"."downloads" TO "authenticated";
GRANT ALL ON TABLE "public"."downloads" TO "service_role";



GRANT ALL ON TABLE "public"."points_transactions" TO "anon";
GRANT ALL ON TABLE "public"."points_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."points_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop trigger if exists "trg_likes_dec" on "public"."community_reactions";

drop trigger if exists "trg_likes_inc" on "public"."community_reactions";

drop trigger if exists "trg_replies_dec" on "public"."community_replies";

drop trigger if exists "trg_replies_inc" on "public"."community_replies";

drop trigger if exists "dataset_upload_reward" on "public"."datasets";

drop trigger if exists "update_dataset_timestamp" on "public"."datasets";

drop trigger if exists "update_datasets_updated_at" on "public"."datasets";

drop trigger if exists "review_reward_trigger" on "public"."reviews";

drop trigger if exists "update_reviews_updated_at" on "public"."reviews";

drop trigger if exists "update_users_updated_at" on "public"."users";

alter table "public"."citations" drop constraint "citations_citing_user_id_fkey";

alter table "public"."citations" drop constraint "citations_dataset_id_fkey";

alter table "public"."community_reactions" drop constraint "community_reactions_thread_id_fkey";

alter table "public"."community_replies" drop constraint "community_replies_thread_id_fkey";

alter table "public"."datasets" drop constraint "datasets_user_id_fkey";

alter table "public"."downloads" drop constraint "downloads_dataset_id_fkey";

alter table "public"."downloads" drop constraint "downloads_user_id_fkey";

alter table "public"."points_transactions" drop constraint "points_transactions_user_id_fkey";

alter table "public"."reviews" drop constraint "reviews_dataset_id_fkey";

alter table "public"."reviews" drop constraint "reviews_reviewer_id_fkey";

alter table "public"."wallet_transactions" drop constraint "wallet_transactions_user_id_fkey";

alter table "public"."citations" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."community_replies" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."community_threads" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."community_threads" alter column "topic" set data type public.community_topic using "topic"::text::public.community_topic;

alter table "public"."datasets" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."datasets" alter column "share_link" set default extensions.uuid_generate_v4();

alter table "public"."datasets" alter column "share_token" set default encode(extensions.gen_random_bytes(16), 'hex'::text);

alter table "public"."downloads" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."points_transactions" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."reviews" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."citations" add constraint "citations_citing_user_id_fkey" FOREIGN KEY (citing_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."citations" validate constraint "citations_citing_user_id_fkey";

alter table "public"."citations" add constraint "citations_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE not valid;

alter table "public"."citations" validate constraint "citations_dataset_id_fkey";

alter table "public"."community_reactions" add constraint "community_reactions_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.community_threads(id) ON DELETE CASCADE not valid;

alter table "public"."community_reactions" validate constraint "community_reactions_thread_id_fkey";

alter table "public"."community_replies" add constraint "community_replies_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.community_threads(id) ON DELETE CASCADE not valid;

alter table "public"."community_replies" validate constraint "community_replies_thread_id_fkey";

alter table "public"."datasets" add constraint "datasets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."datasets" validate constraint "datasets_user_id_fkey";

alter table "public"."downloads" add constraint "downloads_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE not valid;

alter table "public"."downloads" validate constraint "downloads_dataset_id_fkey";

alter table "public"."downloads" add constraint "downloads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."downloads" validate constraint "downloads_user_id_fkey";

alter table "public"."points_transactions" add constraint "points_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."points_transactions" validate constraint "points_transactions_user_id_fkey";

alter table "public"."reviews" add constraint "reviews_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_dataset_id_fkey";

alter table "public"."reviews" add constraint "reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_reviewer_id_fkey";

alter table "public"."wallet_transactions" add constraint "wallet_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."wallet_transactions" validate constraint "wallet_transactions_user_id_fkey";

CREATE TRIGGER trg_likes_dec AFTER DELETE ON public.community_reactions FOR EACH ROW EXECUTE FUNCTION public.decrement_likes_count();

CREATE TRIGGER trg_likes_inc AFTER INSERT ON public.community_reactions FOR EACH ROW EXECUTE FUNCTION public.bump_likes_count();

CREATE TRIGGER trg_replies_dec AFTER DELETE ON public.community_replies FOR EACH ROW EXECUTE FUNCTION public.decrement_replies_count();

CREATE TRIGGER trg_replies_inc AFTER INSERT ON public.community_replies FOR EACH ROW EXECUTE FUNCTION public.bump_replies_count();

CREATE TRIGGER dataset_upload_reward AFTER INSERT ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.on_dataset_insert_reward();

CREATE TRIGGER update_dataset_timestamp BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_dataset_timestamp();

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER review_reward_trigger AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.on_review_insert_reward();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Authenticated users can upload files tlpdrv_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'datasets'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Public can view dataset files tlpdrv_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'datasets'::text));



