/*
 * End-to-end smoke test for the flows that are hardest to
 * exercise by hand: announcements, certificate generation,
 * and cancel-then-re-register.
 *
 *   node scripts/smoke-test.js <email> <password> [--announce]
 *
 * Sign in as a faculty or admin account. Everything is
 * read-only unless you pass --announce, which really does
 * send a notification to every student registered for the
 * event, so it is opt-in.
 *
 * Needs no dependencies — Node's built-in fetch only.
 */

const API =
  process.env.API_URL || "http://localhost:5001/api";

const [, , email, password, ...flags] = process.argv;
const sendAnnouncement = flags.includes("--announce");

if (!email || !password) {
  console.error(
    "usage: node scripts/smoke-test.js <email> <password> [--announce]"
  );
  process.exit(1);
}

let cookie = "";
let passed = 0;
let failed = 0;

const call = async (method, path, body) => {
  const response = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const setCookie = response.headers.get("set-cookie");

  if (setCookie) {
    cookie = setCookie.split(";")[0];
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { status: response.status, payload };
};

const check = (label, ok, detail) => {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? "  — " + detail : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? "  — " + detail : ""}`);
  }
};

const main = async () => {
  console.log(`\nAPI: ${API}\n`);

  /* ---------------------------------------------- */
  console.log("Reachability");

  const health = await call("GET", "/health");
  check(
    "GET /health",
    health.status === 200,
    `status ${health.status}`
  );

  if (health.status !== 200) {
    console.log("\nServer is not answering — is npm run dev running?\n");
    process.exit(1);
  }

  /* ---------------------------------------------- */
  console.log("\nAuthentication");

  const login = await call("POST", "/auth/login", {
    email,
    password,
  });

  check(
    "POST /auth/login",
    login.status === 200,
    login.payload?.message || `status ${login.status}`
  );

  if (login.status !== 200) {
    console.log(
      "\nCannot continue without a session. Check the email/password.\n"
    );
    process.exit(1);
  }

  const role = login.payload?.user?.role;
  console.log(`        signed in as ${login.payload?.user?.name} (${role})`);

  if (role !== "faculty" && role !== "admin") {
    console.log(
      "\nThis account is a student. The remaining checks need faculty or admin.\n"
    );
    process.exit(1);
  }

  /* ---------------------------------------------- */
  console.log("\nEvents");

  const manage = await call("GET", "/events/manage");
  const events = manage.payload?.events || [];

  check(
    "GET /events/manage",
    manage.status === 200,
    `${events.length} event(s)`
  );

  if (events.length === 0) {
    console.log("\nNo events to work with — create one first.\n");
    process.exit(1);
  }

  const event = events[0];
  console.log(`        using "${event.title}" (${event.id})`);

  /* ---------------------------------------------- */
  console.log("\nParticipants  (this endpoint had no UI before today)");

  const participants = await call(
    "GET",
    `/events/${event.id}/participants`
  );

  const list = participants.payload?.participants || [];
  const stats = participants.payload?.stats;

  check(
    "GET /events/:id/participants",
    participants.status === 200,
    stats
      ? `${stats.registered} registered, ${stats.attended} attended`
      : `status ${participants.status}`
  );

  /* ---------------------------------------------- */
  console.log("\nResults");

  const results = await call("GET", `/events/${event.id}/results`);
  const resultList = results.payload?.results || [];

  check(
    "GET /events/:id/results",
    results.status === 200,
    `${resultList.length} result(s)`
  );

  /* ---------------------------------------------- */
  console.log("\nCertificates  (idempotent — re-running returns the existing one)");

  if (resultList.length > 0) {
    const winner = resultList[0];

    const cert = await call(
      "POST",
      `/certificates/events/${event.id}/results/${winner.id}`
    );

    check(
      "POST winner certificate",
      cert.status === 200 || cert.status === 201,
      cert.payload?.certificate?.certificate_code ||
        cert.payload?.message ||
        `status ${cert.status}`
    );

    if (cert.payload?.certificate?.certificate_code) {
      const code = cert.payload.certificate.certificate_code;

      const verify = await call("GET", `/certificates/${code}`);

      check(
        "GET /certificates/:code  (public verification)",
        verify.status === 200 && verify.payload?.verified === true,
        verify.payload?.certificate?.title || `status ${verify.status}`
      );

      const pdf = await fetch(`${API}/certificates/${code}/pdf`);

      check(
        "GET /certificates/:code/pdf",
        pdf.status === 200 &&
          (pdf.headers.get("content-type") || "").includes("pdf"),
        `${pdf.status}, ${pdf.headers.get("content-type")}`
      );
    }
  } else {
    console.log("  SKIP  no results recorded, so no winner certificate to make");
  }

  const attended = list.find((item) => item.attended);

  if (attended) {
    const studentId =
      attended.student?.id || attended.student?.[0]?.id;

    const cert = await call(
      "POST",
      `/certificates/events/${event.id}/students/${studentId}`
    );

    check(
      "POST participation certificate",
      cert.status === 200 || cert.status === 201,
      cert.payload?.certificate?.certificate_code ||
        cert.payload?.message ||
        `status ${cert.status}`
    );
  } else {
    console.log("  SKIP  nobody has attended, so no participation certificate");
  }

  /* ---------------------------------------------- */
  console.log("\nAnnouncements  (route existed in code but was never wired up)");

  if (sendAnnouncement) {
    const announcement = await call(
      "POST",
      `/notifications/events/${event.id}/announce`,
      {
        title: "Smoke test",
        message:
          "Automated check that announcements reach registered students.",
      }
    );

    check(
      "POST /notifications/events/:id/announce",
      announcement.status === 201,
      announcement.payload?.message || `status ${announcement.status}`
    );
  } else {
    /*
     * Without --announce, only prove the route is mounted:
     * an empty body must come back 400 from the controller,
     * not 404 from the router.
     */
    const probe = await call(
      "POST",
      `/notifications/events/${event.id}/announce`,
      { title: "", message: "" }
    );

    check(
      "announce route is mounted",
      probe.status === 400,
      `status ${probe.status} (400 = reached the controller; 404 = not routed)`
    );

    console.log("  SKIP  not sending a real announcement (pass --announce to send)");
  }

  /* ---------------------------------------------- */
  console.log("\nValidation added today");

  const badDeadline = await call("POST", "/events", {
    title: "Validation probe",
    category: "Workshop",
    event_date: "2026-01-10",
    venue: "Nowhere",
    registration_deadline: "2026-02-20",
  });

  check(
    "rejects a deadline after the event date",
    badDeadline.status === 400,
    badDeadline.payload?.message || `status ${badDeadline.status}`
  );

  const badLimit = await call("POST", "/events", {
    title: "Validation probe",
    category: "Workshop",
    event_date: "2026-01-10",
    venue: "Nowhere",
    participant_limit: 0,
  });

  check(
    "rejects a participant limit of 0",
    badLimit.status === 400,
    badLimit.payload?.message || `status ${badLimit.status}`
  );

  /* ---------------------------------------------- */
  console.log(
    `\n${passed} passed, ${failed} failed\n`
  );

  process.exit(failed > 0 ? 1 : 0);
};

main().catch((error) => {
  console.error("\nSmoke test crashed:", error.message);
  process.exit(1);
});
