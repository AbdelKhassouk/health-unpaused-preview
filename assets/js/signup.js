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

  function subscribe(email, segment) {
    var url = "https://a.klaviyo.com/client/subscriptions/?company_id=" + encodeURIComponent(CFG.companyId);
    var body = {
      data: {
        type: "subscription",
        attributes: {
          custom_source: CFG.source,
          profile: {
            data: {
              type: "profile",
              attributes: { email: email, properties: { segment: segment, segment_label: LABELS[segment] } }
            }
          }
        },
        relationships: { list: { data: { type: "list", id: CFG.lists[segment] } } }
      }
    };
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "revision": "2024-10-15" },
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) throw new Error("klaviyo " + r.status); });
  }

  function fallback(email, segment) {
    var subject = "Subscribe — " + LABELS[segment];
    var text = "Please add " + email + " to the " + LABELS[segment] + " briefing list.";
    window.location.href = "mailto:" + CFG.fallbackEmail +
      "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
  }

  function showDone(form, segment, viaFallback) {
    var done = form.querySelector(".signup__done");
    var fields = form.querySelector(".signup__fields");
    if (fields) fields.hidden = true;
    var html = "";
    if (viaFallback) {
      html += "<p class='signup__lead'>Your email app has opened with everything filled in — just hit send and we'll add you.</p>";
    } else {
      html += "<p class='signup__lead'>You're in. Your first brief is on its way.</p>";
    }
    if (segment === "women") {
      html += "<p>And this is where the conversation happens — a safe, judgement-free space with women who get it:</p>" +
              "<a class='btn-gold' href='" + CFG.skoolUrl + "' target='_blank' rel='noopener'>Join the community ↗</a>";
    } else {
      html += "<p>We'll also be in touch personally to set up your " + LABELS[segment].toLowerCase() + " subscription.</p>";
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

  document.querySelectorAll("form[data-signup]").forEach(function (form) {
    var preset = form.getAttribute("data-segment");
    var select = form.querySelector("select[name=segment]");
    if (preset && select) { select.value = preset; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setError(form, "");
      var email = (form.querySelector("input[name=email]").value || "").trim();
      var segment = select ? select.value : preset;
      var consent = form.querySelector("input[name=consent]");
      if (!segment) { setError(form, "Please tell us who you are, so we send the right brief."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(form, "That email doesn't look right — could you check it?"); return; }
      if (consent && !consent.checked) { setError(form, "Please tick the box so we're allowed to email you."); return; }

      var btn = form.querySelector("button[type=submit]");
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = "One moment…";

      var finish = function (viaFallback) { btn.disabled = false; btn.textContent = label; showDone(form, segment, viaFallback); };

      if (!configured(segment)) { fallback(email, segment); finish(true); return; }
      subscribe(email, segment)
        .then(function () { finish(false); })
        .catch(function () { fallback(email, segment); finish(true); });
    });
  });
})();
