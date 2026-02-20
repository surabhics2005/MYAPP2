import os
import json
import jwt
from datetime import datetime, timedelta

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from db import get_db, init_db

SECRET = os.getenv("JWT_SECRET", "CHANGE_ME_SECRET")

# Set admin emails here (lowercase)
ADMIN_EMAILS = {
    "surabhics2005@gmail.com"
}

app = Flask(__name__)
CORS(app)


# =========================================================
# TOKEN
# =========================================================
def create_token(user_id: int, email: str):
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def auth_required(fn):
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401
        token = auth.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        except Exception:
            return jsonify({"error": "Invalid/expired token"}), 401
        request.user = payload
        return fn(*args, **kwargs)

    wrapper.__name__ = fn.__name__
    return wrapper


def admin_required(fn):
    @auth_required
    def wrapper(*args, **kwargs):
        email = (request.user.get("email") or "").strip().lower()
        if ADMIN_EMAILS and email not in ADMIN_EMAILS:
            return jsonify({"error": "Admin only"}), 403
        return fn(*args, **kwargs)

    wrapper.__name__ = fn.__name__
    return wrapper


# =========================================================
# HEALTH
# =========================================================
@app.get("/health")
def health():
    return jsonify({"ok": True})


# =========================================================
# AUTH
# =========================================================
@app.post("/auth/register")
def register():
    data = request.json or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email & password required"}), 400

    pw_hash = generate_password_hash(password)

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO users(name,email,password_hash,created_at) VALUES (?,?,?,?)",
            (name, email, pw_hash, datetime.utcnow().isoformat()),
        )
        conn.commit()
        user_id = cur.lastrowid
    except Exception:
        conn.close()
        return jsonify({"error": "Email already exists"}), 409
    conn.close()

    token = create_token(user_id, email)
    return jsonify({"token": token, "user": {"id": user_id, "email": email, "name": name}})


@app.post("/auth/login")
def login():
    data = request.json or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()

    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(row["id"], row["email"])
    return jsonify({"token": token, "user": {"id": row["id"], "email": row["email"], "name": row["name"]}})


# =========================================================
# CARDS (USER)
# =========================================================
@app.get("/cards")
@auth_required
def list_cards():
    user_id = request.user["user_id"]

    conn = get_db()
    rows = conn.execute(
        "SELECT id,title,data,theme,created_at,updated_at FROM cards WHERE user_id=? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()

    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "title": r["title"],
                "data": json.loads(r["data"]),
                "theme": r["theme"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
        )
    return jsonify(out)


@app.post("/cards/save")
@auth_required
def save_card():
    user_id = request.user["user_id"]
    body = request.json or {}

    card_id = (body.get("id") or "").strip()
    if not card_id:
        return jsonify({"error": "Card id required"}), 400

    title = (body.get("title") or "").strip()
    theme = (body.get("theme") or "").strip()
    data_obj = body.get("data")
    if data_obj is None:
        return jsonify({"error": "Card data required"}), 400

    data_json = json.dumps(data_obj, ensure_ascii=False)

    conn = get_db()
    now = datetime.utcnow().isoformat()

    existing = conn.execute(
        "SELECT id FROM cards WHERE id=? AND user_id=?",
        (card_id, user_id),
    ).fetchone()

    if existing:
        conn.execute(
            "UPDATE cards SET title=?, data=?, theme=?, updated_at=? WHERE id=? AND user_id=?",
            (title, data_json, theme, now, card_id, user_id),
        )
    else:
        conn.execute(
            "INSERT INTO cards(id,user_id,title,data,theme,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
            (card_id, user_id, title, data_json, theme, now, now),
        )

    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": card_id})


@app.delete("/cards/<card_id>")
@auth_required
def delete_card(card_id):
    user_id = request.user["user_id"]
    card_id = (card_id or "").strip()

    conn = get_db()
    conn.execute("DELETE FROM cards WHERE id=? AND user_id=?", (card_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.get("/card/<card_id>")
def public_card(card_id):
    """Public card fetch (share link)"""
    conn = get_db()
    row = conn.execute("SELECT id,data,theme,user_id FROM cards WHERE id=?", (card_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404

    return jsonify(
        {"id": row["id"], "data": json.loads(row["data"]), "theme": row["theme"], "owner_user_id": row["user_id"]}
    )


# =========================================================
# ADMIN PANEL
# =========================================================
@app.get("/admin/users")
@admin_required
def admin_users():
    conn = get_db()
    rows = conn.execute("SELECT id,name,email,created_at FROM users ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.get("/admin/cards")
@admin_required
def admin_cards():
    conn = get_db()
    rows = conn.execute(
        "SELECT id,user_id,title,theme,created_at,updated_at FROM cards ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.post("/admin/delete_user")
@admin_required
def admin_delete_user():
    data = request.json or {}
    user_id = data.get("id")
    if not user_id:
        return jsonify({"error": "User id required"}), 400

    conn = get_db()
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.post("/admin/delete_card")
@admin_required
def admin_delete_card():
    data = request.json or {}
    card_id = (data.get("id") or "").strip()
    if not card_id:
        return jsonify({"error": "Card id required"}), 400

    conn = get_db()
    conn.execute("DELETE FROM cards WHERE id=?", (card_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# =========================================================
# ANALYTICS (PUBLIC TRACKING) - single endpoint (NO duplicates)
# - Anyone can POST view/click/save for a card_id
# - We store under OWNER user_id (card owner) so analytics works for public visitors too
# =========================================================
def _get_card_owner_id(card_id: str):
    conn = get_db()
    row = conn.execute("SELECT user_id FROM cards WHERE id=?", (card_id,)).fetchone()
    conn.close()
    return row["user_id"] if row else None


@app.post("/analytics/event")
def analytics_event():
    data = request.json or {}
    card_id = (data.get("card_id") or "").strip()
    event_type = (data.get("event_type") or "").strip().lower()
    action = (data.get("action") or "").strip().lower()
    src = (data.get("src") or "").strip().lower()
    visitor_id = (data.get("visitor_id") or "").strip()
    ts = (data.get("ts") or "").strip()

    if not card_id or event_type not in ("view", "click", "save"):
        return jsonify({"error": "card_id + valid event_type required"}), 400

    owner_id = _get_card_owner_id(card_id)
    if owner_id is None:
        return jsonify({"error": "Card not found"}), 404

    created_at = ts if ts else datetime.utcnow().isoformat()

    conn = get_db()
    conn.execute(
        """INSERT INTO analytics_events(user_id, card_id, event_type, action, src, visitor_id, created_at)
           VALUES (?,?,?,?,?,?,?)""",
        (owner_id, card_id, event_type, action, src, visitor_id, created_at),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.get("/analytics/summary/<card_id>")
@auth_required
def analytics_summary(card_id):
    """Owner-only summary for analytics page"""
    user_id = request.user["user_id"]
    card_id = (card_id or "").strip()

    conn = get_db()
    owner = conn.execute("SELECT user_id FROM cards WHERE id=?", (card_id,)).fetchone()
    if not owner:
        conn.close()
        return jsonify({"error": "Card not found"}), 404
    if owner["user_id"] != user_id:
        conn.close()
        return jsonify({"error": "Not allowed"}), 403

    views = conn.execute(
        "SELECT COUNT(*) AS c FROM analytics_events WHERE user_id=? AND card_id=? AND event_type='view'",
        (user_id, card_id),
    ).fetchone()["c"]

    clicks = conn.execute(
        "SELECT COUNT(*) AS c FROM analytics_events WHERE user_id=? AND card_id=? AND event_type='click'",
        (user_id, card_id),
    ).fetchone()["c"]

    saves = conn.execute(
        "SELECT COUNT(*) AS c FROM analytics_events WHERE user_id=? AND card_id=? AND event_type='save'",
        (user_id, card_id),
    ).fetchone()["c"]

    unique_visitors = conn.execute(
        """SELECT COUNT(DISTINCT visitor_id) AS c
           FROM analytics_events
           WHERE user_id=? AND card_id=? AND event_type='view' AND visitor_id<>''""",
        (user_id, card_id),
    ).fetchone()["c"]

    click_rows = conn.execute(
        """SELECT action, COUNT(*) AS c
           FROM analytics_events
           WHERE user_id=? AND card_id=? AND event_type='click'
           GROUP BY action
           ORDER BY c DESC""",
        (user_id, card_id),
    ).fetchall()

    src_rows = conn.execute(
        """SELECT src, COUNT(*) AS c
           FROM analytics_events
           WHERE user_id=? AND card_id=? AND event_type='view'
           GROUP BY src
           ORDER BY c DESC""",
        (user_id, card_id),
    ).fetchall()

    recent_rows = conn.execute(
        """SELECT event_type, action, src, visitor_id, created_at
           FROM analytics_events
           WHERE user_id=? AND card_id=?
           ORDER BY id DESC
           LIMIT 50""",
        (user_id, card_id),
    ).fetchall()
    conn.close()

    return jsonify(
        {
            "card_id": card_id,
            "views": views,
            "clicks": clicks,
            "saves": saves,
            "unique_visitors": unique_visitors,
            "click_breakdown": {(r["action"] or "unknown"): r["c"] for r in click_rows},
            "src_breakdown": {(r["src"] or "direct"): r["c"] for r in src_rows},
            "recent": [
                {
                    "event_type": r["event_type"],
                    "action": r["action"] or "",
                    "src": r["src"] or "",
                    "visitor_id": r["visitor_id"] or "",
                    "ts": r["created_at"],
                }
                for r in recent_rows
            ],
        }
    )


# =========================================================
# START SERVER
# =========================================================
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
