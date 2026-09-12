


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



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."enforce_participant_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  lim integer;
  taken integer;
begin
  /*
   * A cancelled registration occupies no slot, so cancelling is
   * always allowed and never needs a capacity check.
   */
  if new.status = 'cancelled' then
    return new;
  end if;

  /*
   * FOR UPDATE is the whole point. It locks this event's row for the
   * duration of the transaction, so a second registration for the
   * same event blocks here until the first commits — and then counts
   * it. Without the lock both transactions read the same stale count.
   *
   * Different events lock different rows, so registrations for
   * unrelated events never wait on each other.
   */
  select participant_limit
    into lim
  from public.events
  where id = new.event_id
  for update;

  -- No limit set means unlimited; nothing to enforce.
  if lim is null then
    return new;
  end if;

  select count(*)
    into taken
  from public.registrations
  where event_id = new.event_id
    and status <> 'cancelled'
    /*
     * On UPDATE (a cancelled registration being revived) the row
     * already exists, so it must not count itself.
     */
    and id is distinct from new.id;

  if taken >= lim then
    raise exception 'EVENT_FULL'
      using
        errcode = 'P0001',
        hint = 'participant_limit reached for this event';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_participant_limit"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "attended_at" timestamp with time zone DEFAULT "now"(),
    "marked_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "certificate_code" "text" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "result_id" "uuid",
    "certificate_type" "text" DEFAULT 'winner'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "certificate_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    CONSTRAINT "certificates_certificate_type_check" CHECK (("certificate_type" = ANY (ARRAY['winner'::"text", 'participation'::"text"])))
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "max_score" numeric(6,2) DEFAULT 10 NOT NULL,
    "weight" numeric(6,2) DEFAULT 1 NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "evaluation_criteria_max_score_check" CHECK (("max_score" > (0)::numeric)),
    CONSTRAINT "evaluation_criteria_weight_check" CHECK (("weight" > (0)::numeric))
);


ALTER TABLE "public"."evaluation_criteria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_judges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_judges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "student_id" "uuid",
    "registration_id" "uuid",
    "position" integer NOT NULL,
    "score" numeric(10,2),
    "remarks" "text",
    "announced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    CONSTRAINT "event_results_position_check" CHECK (("position" > 0)),
    CONSTRAINT "event_results_subject_check" CHECK (((("student_id" IS NOT NULL) AND ("team_id" IS NULL)) OR (("student_id" IS NULL) AND ("team_id" IS NOT NULL))))
);


ALTER TABLE "public"."event_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_volunteers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "volunteer_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_volunteers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "venue" "text" NOT NULL,
    "registration_deadline" timestamp with time zone,
    "participant_limit" integer,
    "rules" "text",
    "image_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "organizer_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "results_finalized_at" timestamp with time zone,
    "results_finalized_by" "uuid",
    "participation_type" "text" DEFAULT 'individual'::"text" NOT NULL,
    "min_team_size" integer DEFAULT 1 NOT NULL,
    "max_team_size" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "events_participation_type_check" CHECK (("participation_type" = ANY (ARRAY['individual'::"text", 'team'::"text"]))),
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'ongoing'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "events_team_size_check" CHECK ((("min_team_size" >= 1) AND ("max_team_size" >= "min_team_size") AND (("participation_type" = 'team'::"text") OR (("min_team_size" = 1) AND ("max_team_size" = 1))))),
    CONSTRAINT "participant_limit_positive" CHECK ((("participant_limit" IS NULL) OR ("participant_limit" > 0)))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_evaluation_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evaluation_id" "uuid" NOT NULL,
    "criterion_id" "uuid" NOT NULL,
    "score" numeric(6,2) NOT NULL,
    CONSTRAINT "judge_evaluation_scores_score_check" CHECK (("score" >= (0)::numeric))
);


ALTER TABLE "public"."judge_evaluation_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."judge_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "registration_id" "uuid",
    "student_id" "uuid",
    "total_score" numeric(8,3) DEFAULT 0 NOT NULL,
    "max_total" numeric(8,3) DEFAULT 0 NOT NULL,
    "remarks" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid",
    CONSTRAINT "judge_evaluations_subject_check" CHECK (((("registration_id" IS NOT NULL) AND ("team_id" IS NULL)) OR (("registration_id" IS NULL) AND ("team_id" IS NOT NULL))))
);


ALTER TABLE "public"."judge_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'general'::"text" NOT NULL,
    "event_id" "uuid",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['general'::"text", 'registration'::"text", 'event_reminder'::"text", 'announcement'::"text", 'attendance'::"text", 'result'::"text", 'certificate'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registration_code" "text" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'registered'::"text" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    CONSTRAINT "registrations_status_check" CHECK (("status" = ANY (ARRAY['registered'::"text", 'cancelled'::"text", 'attended'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['leader'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "team_code" "text" NOT NULL,
    "leader_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "teams_name_not_blank" CHECK (("length"("btrim"("name")) > 0)),
    CONSTRAINT "teams_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "department" "text",
    "year" integer,
    "profile_image" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'faculty'::"text", 'admin'::"text", 'judge'::"text", 'volunteer'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_registration_id_key" UNIQUE ("registration_id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_certificate_code_key" UNIQUE ("certificate_code");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_event_id_student_id_certificate_type_key" UNIQUE ("event_id", "student_id", "certificate_type");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_criteria"
    ADD CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_judges"
    ADD CONSTRAINT "event_judges_event_id_judge_id_key" UNIQUE ("event_id", "judge_id");



ALTER TABLE ONLY "public"."event_judges"
    ADD CONSTRAINT "event_judges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_results"
    ADD CONSTRAINT "event_results_event_id_position_key" UNIQUE ("event_id", "position");



ALTER TABLE ONLY "public"."event_results"
    ADD CONSTRAINT "event_results_event_id_student_id_key" UNIQUE ("event_id", "student_id");



ALTER TABLE ONLY "public"."event_results"
    ADD CONSTRAINT "event_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_volunteers"
    ADD CONSTRAINT "event_volunteers_event_id_volunteer_id_key" UNIQUE ("event_id", "volunteer_id");



ALTER TABLE ONLY "public"."event_volunteers"
    ADD CONSTRAINT "event_volunteers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judge_evaluation_scores"
    ADD CONSTRAINT "judge_evaluation_scores_evaluation_id_criterion_id_key" UNIQUE ("evaluation_id", "criterion_id");



ALTER TABLE ONLY "public"."judge_evaluation_scores"
    ADD CONSTRAINT "judge_evaluation_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."judge_evaluations"
    ADD CONSTRAINT "judge_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_event_id_student_id_key" UNIQUE ("event_id", "student_id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_registration_code_key" UNIQUE ("registration_code");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_student_id_key" UNIQUE ("team_id", "student_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_team_code_key" UNIQUE ("team_code");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "attendance_event_id_idx" ON "public"."attendance" USING "btree" ("event_id");



CREATE INDEX "attendance_event_idx" ON "public"."attendance" USING "btree" ("event_id");



CREATE UNIQUE INDEX "attendance_one_per_registration" ON "public"."attendance" USING "btree" ("registration_id");



CREATE INDEX "attendance_registration_id_idx" ON "public"."attendance" USING "btree" ("registration_id");



CREATE INDEX "attendance_student_id_idx" ON "public"."attendance" USING "btree" ("student_id");



CREATE INDEX "certificates_code_idx" ON "public"."certificates" USING "btree" ("certificate_code");



CREATE UNIQUE INDEX "certificates_code_unique" ON "public"."certificates" USING "btree" ("certificate_code");



CREATE INDEX "certificates_event_id_idx" ON "public"."certificates" USING "btree" ("event_id");



CREATE UNIQUE INDEX "certificates_one_per_student_event_type" ON "public"."certificates" USING "btree" ("event_id", "student_id", "certificate_type");



CREATE INDEX "certificates_student_id_idx" ON "public"."certificates" USING "btree" ("student_id");



CREATE INDEX "certificates_student_idx" ON "public"."certificates" USING "btree" ("student_id");



CREATE INDEX "certificates_team_idx" ON "public"."certificates" USING "btree" ("team_id");



CREATE INDEX "evaluation_criteria_event_idx" ON "public"."evaluation_criteria" USING "btree" ("event_id", "display_order");



CREATE INDEX "event_judges_event_idx" ON "public"."event_judges" USING "btree" ("event_id");



CREATE INDEX "event_judges_judge_idx" ON "public"."event_judges" USING "btree" ("judge_id");



CREATE INDEX "event_results_event_id_idx" ON "public"."event_results" USING "btree" ("event_id");



CREATE UNIQUE INDEX "event_results_one_per_position" ON "public"."event_results" USING "btree" ("event_id", "position");



CREATE UNIQUE INDEX "event_results_one_per_student" ON "public"."event_results" USING "btree" ("event_id", "student_id") WHERE ("student_id" IS NOT NULL);



CREATE UNIQUE INDEX "event_results_one_per_team" ON "public"."event_results" USING "btree" ("event_id", "team_id") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "event_results_student_id_idx" ON "public"."event_results" USING "btree" ("student_id");



CREATE INDEX "event_volunteers_event_idx" ON "public"."event_volunteers" USING "btree" ("event_id");



CREATE INDEX "event_volunteers_volunteer_idx" ON "public"."event_volunteers" USING "btree" ("volunteer_id");



CREATE INDEX "events_date_idx" ON "public"."events" USING "btree" ("event_date");



CREATE INDEX "events_organizer_id_idx" ON "public"."events" USING "btree" ("organizer_id");



CREATE INDEX "events_status_idx" ON "public"."events" USING "btree" ("status");



CREATE INDEX "judge_evaluation_scores_eval_idx" ON "public"."judge_evaluation_scores" USING "btree" ("evaluation_id");



CREATE INDEX "judge_evaluations_event_idx" ON "public"."judge_evaluations" USING "btree" ("event_id");



CREATE INDEX "judge_evaluations_judge_idx" ON "public"."judge_evaluations" USING "btree" ("event_id", "judge_id");



CREATE UNIQUE INDEX "judge_evaluations_one_per_participant" ON "public"."judge_evaluations" USING "btree" ("event_id", "judge_id", "registration_id") WHERE ("registration_id" IS NOT NULL);



CREATE UNIQUE INDEX "judge_evaluations_one_per_team" ON "public"."judge_evaluations" USING "btree" ("event_id", "judge_id", "team_id") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "judge_evaluations_reg_idx" ON "public"."judge_evaluations" USING "btree" ("registration_id");



CREATE INDEX "judge_evaluations_team_idx" ON "public"."judge_evaluations" USING "btree" ("team_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_event_id_idx" ON "public"."notifications" USING "btree" ("event_id");



CREATE INDEX "notifications_unread_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "registrations_code_idx" ON "public"."registrations" USING "btree" ("registration_code");



CREATE UNIQUE INDEX "registrations_code_unique" ON "public"."registrations" USING "btree" ("registration_code");



CREATE INDEX "registrations_event_id_idx" ON "public"."registrations" USING "btree" ("event_id");



CREATE INDEX "registrations_event_idx" ON "public"."registrations" USING "btree" ("event_id");



CREATE UNIQUE INDEX "registrations_one_per_student_event" ON "public"."registrations" USING "btree" ("event_id", "student_id");



CREATE UNIQUE INDEX "registrations_one_team_per_student_event" ON "public"."registrations" USING "btree" ("event_id", "student_id") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "registrations_student_id_idx" ON "public"."registrations" USING "btree" ("student_id");



CREATE INDEX "registrations_student_idx" ON "public"."registrations" USING "btree" ("student_id");



CREATE INDEX "registrations_team_idx" ON "public"."registrations" USING "btree" ("team_id");



CREATE INDEX "team_members_student_idx" ON "public"."team_members" USING "btree" ("student_id");



CREATE INDEX "team_members_team_idx" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "teams_code_idx" ON "public"."teams" USING "btree" ("team_code");



CREATE INDEX "teams_event_idx" ON "public"."teams" USING "btree" ("event_id");



CREATE INDEX "teams_leader_idx" ON "public"."teams" USING "btree" ("leader_id");



CREATE UNIQUE INDEX "teams_one_active_per_leader" ON "public"."teams" USING "btree" ("event_id", "leader_id") WHERE ("status" = 'active'::"text");



CREATE OR REPLACE TRIGGER "registrations_enforce_capacity" BEFORE INSERT OR UPDATE OF "status" ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_participant_limit"();



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "public"."event_results"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."evaluation_criteria"
    ADD CONSTRAINT "evaluation_criteria_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_judges"
    ADD CONSTRAINT "event_judges_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_judges"
    ADD CONSTRAINT "event_judges_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_judges"
    ADD CONSTRAINT "event_judges_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_results"
    ADD CONSTRAINT "event_results_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_results"
    ADD CONSTRAINT "event_results_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_results"
    ADD CONSTRAINT "event_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_results"
    ADD CONSTRAINT "event_results_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_volunteers"
    ADD CONSTRAINT "event_volunteers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_volunteers"
    ADD CONSTRAINT "event_volunteers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_volunteers"
    ADD CONSTRAINT "event_volunteers_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_results_finalized_by_fkey" FOREIGN KEY ("results_finalized_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."judge_evaluation_scores"
    ADD CONSTRAINT "judge_evaluation_scores_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_evaluation_scores"
    ADD CONSTRAINT "judge_evaluation_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "public"."judge_evaluations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_evaluations"
    ADD CONSTRAINT "judge_evaluations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_evaluations"
    ADD CONSTRAINT "judge_evaluations_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_evaluations"
    ADD CONSTRAINT "judge_evaluations_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_evaluations"
    ADD CONSTRAINT "judge_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."judge_evaluations"
    ADD CONSTRAINT "judge_evaluations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evaluation_criteria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_judges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_volunteers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."judge_evaluation_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."judge_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."enforce_participant_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_participant_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_participant_limit"() TO "service_role";


















GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_criteria" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_criteria" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_criteria" TO "service_role";



GRANT ALL ON TABLE "public"."event_judges" TO "anon";
GRANT ALL ON TABLE "public"."event_judges" TO "authenticated";
GRANT ALL ON TABLE "public"."event_judges" TO "service_role";



GRANT ALL ON TABLE "public"."event_results" TO "anon";
GRANT ALL ON TABLE "public"."event_results" TO "authenticated";
GRANT ALL ON TABLE "public"."event_results" TO "service_role";



GRANT ALL ON TABLE "public"."event_volunteers" TO "anon";
GRANT ALL ON TABLE "public"."event_volunteers" TO "authenticated";
GRANT ALL ON TABLE "public"."event_volunteers" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."judge_evaluation_scores" TO "anon";
GRANT ALL ON TABLE "public"."judge_evaluation_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_evaluation_scores" TO "service_role";



GRANT ALL ON TABLE "public"."judge_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."judge_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."judge_evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."registrations" TO "anon";
GRANT ALL ON TABLE "public"."registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."registrations" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









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































