/* Health Unpaused — segment signup → Klaviyo lists
   ------------------------------------------------------------------
   CONFIG: fill these in once Kia shares the Klaviyo account details.
   - companyId : Klaviyo PUBLIC API key ("Company ID", 6 characters)
   - lists     : Klaviyo LIST IDs, one per segment
   Until configured, the form falls back to opening a pre-filled email
   to hello@healthunpaused.com so no signup is ever lost.
   ------------------------------------------------------------------ */
window.HU_SIGNUP = window.HU_SIGNUP || {
  companyId: "",
  lists: { women: "", doctors: "", hr: "", insurance: "" },
  fallbackEmail: "hello@healthunpaused.com",
  skoolUrl: "https://www.skool.com/women-unpaused-4360",
  source: "Health Unpaused website"
};

(function () {
  "use strict";
  var CFG = window.HU_SIGNUP;
  var LABELS = {
    women: "Woman navigating menopause",
    doctors: "Doctor / clinician",
    hr: "HR / People team",
    insurance: "Health insurer"
  };

  function configured(segment) {
    return !!(CFG.companyId && CFG.lists && CFG.lists[segment]);
  }

  /* Collect common fields + only the visible segment group's fields */
  function collect(form, segment) {
    var d = {};
    var get = function (sel) { var el = form.querySelector(sel); return el ? (el.value || "").trim() : ""; };
    d.first_name = get("input[name=first_name]");
    d.last_name = get("input[name=last_name]");
    d.email = get("input[name=email]");
    d.phone = get("input[name=phone]");
    d.segment = segment;
    d.segment_label = LABELS[segment] || segment;
    var group = form.querySelector('.signup__extra[data-for="' + segment + '"]');
    if (group) {
      group.querySelectorAll("input,select").forEach(function (el) {
        var v = (el.value || "").trim();
        if (v) d[el.name] = v;
      });
    }
    return d;
  }

  function toE164(phone) {
    var p = (phone || "").replace(/[\s().-]/g, "");
    return /^\+[1-9]\d{6,14}$/.test(p) ? p : null;
  }

  function subscribe(d) {
    var url = "https://a.klaviyo.com/client/subscriptions/?company_id=" + encodeURIComponent(CFG.companyId);
    var attrs = { email: d.email, properties: {} };
    if (d.first_name) attrs.first_name = d.first_name;
    if (d.last_name) attrs.last_name = d.last_name;
    var e164 = toE164(d.phone);
    if (e164) attrs.phone_number = e164; else if (d.phone) attrs.properties.phone = d.phone;
    ["segment", "segment_label", "journey_stage", "role", "company", "company_size", "country"].forEach(function (k) {
      if (d[k]) attrs.properties[k] = d[k];
    });
    var body = {
      data: {
        type: "subscription",
        attributes: {
          custom_source: CFG.source,
          profile: { data: { type: "profile", attributes: attrs } }
        },
        relationships: { list: { data: { type: "list", id: CFG.lists[d.segment] } } }
      }
    };
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "revision": "2024-10-15" },
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error("klaviyo " + r.status); });
  }

  function fallback(d) {
    var subject = "Subscribe — " + d.segment_label;
    var lines = ["Please add me to the " + d.segment_label + " briefing list.", ""];
    var order = ["first_name", "last_name", "email", "phone", "journey_stage", "role", "company", "company_size", "country"];
    order.forEach(function (k) { if (d[k]) lines.push(k.replace(/_/g, " ") + ": " + d[k]); });
    window.location.href = "mailto:" + CFG.fallbackEmail +
      "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function showDone(form, d, viaFallback) {
    var done = form.querySelector(".signup__done");
    form.querySelectorAll(".signup__grid, .signup__consent, .signup__submit, .signup__intro").forEach(function (el) { el.hidden = true; });
    var name = d.first_name ? ", " + d.first_name : "";
    var html = "";
    if (viaFallback) {
      html += "<p class='signup__lead'>Nearly there" + name + " — your email app has opened with everything filled in. Just hit send.</p>";
    } else {
      html += "<p class='signup__lead'>You're in" + name + ". Your first brief is on its way.</p>";
    }
    if (d.segment === "women") {
      html += "<p>And this is where the conversation happens — a safe, judgement-free space with women who get it:</p>" +
              "<a class='btn-gold' href='" + CFG.skoolUrl + "' target='_blank' rel='noopener'>Join the community ↗</a>";
    } else {
      html += "<p>Subscription details for the " + d.segment_label.toLowerCase() + " brief will follow by email.</p>";
    }
    done.innerHTML = html;
    done.hidden = false;
    done.setAttribute("tabindex", "-1");
    done.focus();
  }

  function setError(form, msg) {
    var err = form.querySelector(".signup__error");
    if (!err) return;
    err.textContent = msg || "";
    err.hidden = !msg;
  }

  function showGroup(form, segment) {
    form.querySelectorAll(".signup__extra").forEach(function (g) {
      g.hidden = g.getAttribute("data-for") !== segment;
    });
  }

  document.querySelectorAll("form[data-signup]").forEach(function (form) {
    var preset = form.getAttribute("data-segment");
    var select = form.querySelector("select[name=segment]");
    if (preset && select) select.value = preset;
    showGroup(form, select ? select.value : preset);
    if (select) select.addEventListener("change", function () { showGroup(form, select.value); setError(form, ""); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setError(form, "");
      var segment = select ? select.value : preset;
      var d = collect(form, segment);
      var consent = form.querySelector("input[name=consent]");
      if (!segment) { setError(form, "Please tell us who you are, so we send the right brief."); return; }
      if (!d.first_name) { setError(form, "Please tell us your first name."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { setError(form, "That email doesn't look right — could you check it?"); return; }
      if (d.phone && !/^[+\d][\d\s().-]{5,}$/.test(d.phone)) { setError(form, "That phone number doesn't look right — or leave it blank."); return; }
      if (consent && !consent.checked) { setError(form, "Please tick the box so we're allowed to email you."); return; }

      var btn = form.querySelector(".signup__submit");
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = "One moment…";
      var finish = function (viaFallback) { btn.disabled = false; btn.textContent = label; showDone(form, d, viaFallback); };

      if (!configured(segment)) { fallback(d); finish(true); return; }
      subscribe(d).then(function () { finish(false); })
                  .catch(function () { fallback(d); finish(true); });
    });
  });
})();
