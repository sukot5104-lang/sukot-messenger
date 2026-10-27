#!/bin/bash
# SUKOT MESSENGER — end-to-end API test
set -e
BASE="http://localhost:3000"
JAR_A="/tmp/sukot_test_a.txt"
JAR_B="/tmp/sukot_test_b.txt"
rm -f $JAR_A $JAR_B

echo "=== 1. Register user A (ali_test) ==="
curl -s -c $JAR_A -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"ali_test","displayName":"علی تستی","password":"test1234"}'
echo ""

echo "=== 2. Register user B (sara_test) ==="
curl -s -c $JAR_B -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"sara_test","displayName":"سارا تست","password":"test1234"}'
echo ""

echo "=== 3. Duplicate ID check (ali_test again) ==="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"ali_test","displayName":"دوباره","password":"test1234"}'
echo ""

echo "=== 4. Sukot brand protection (Sukot2, su_kot) ==="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"Sukot2","displayName":"جعل برند","password":"test1234"}'
echo ""
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"su_kot","displayName":"جعل برند","password":"test1234"}'
echo ""

echo "=== 5. Reserved ID check (admin) ==="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"Admin","displayName":"ادمین","password":"test1234"}'
echo ""

echo "=== 6. Case-insensitive duplicate (ALI_TEST) ==="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"ALI_TEST","displayName":"حالت بزرگ","password":"test1234"}'
echo ""

echo "=== 7. check-username live ==="
curl -s "$BASE/api/auth/check-username?username=ali_test"
echo ""

echo "=== 8. Login user A ==="
curl -s -c $JAR_A -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"ali_test","password":"test1234"}' | head -c 200
echo ""

echo "=== 9. Wrong password ==="
curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"ali_test","password":"wrong"}'
echo ""

echo "=== 10. Search sukot ==="
curl -s -b $JAR_A "$BASE/api/users/search?q=sukot" | head -c 300
echo ""

echo "=== 11. Start conversation with sukot ==="
curl -s -b $JAR_A -X POST $BASE/api/conversations -H 'Content-Type: application/json' -d '{"username":"Sukot"}'
echo ""

echo "=== 12. Conversations list for A ==="
curl -s -b $JAR_A $BASE/api/conversations | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps([{'other': c['other']['username'], 'last': c['lastMessage']['content'][:40] if c['lastMessage'] else None} for c in d['conversations']], ensure_ascii=False, indent=1))"

echo "=== 13. Admin login ==="
curl -s -c /tmp/sukot_admin.txt -X POST $BASE/api/admin/login -H 'Content-Type: application/json' -d '{"password":"SukotAdmin@2026"}'
echo ""

echo "=== 14. Admin stats ==="
curl -s -b /tmp/sukot_admin.txt $BASE/api/admin/stats
echo ""

echo "=== 15. Admin users ==="
curl -s -b /tmp/sukot_admin.txt $BASE/api/admin/users | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps([u['username'] for u in d['users']]))"

echo "=== 16. Report user B by A ==="
curl -s -b $JAR_A -X POST $BASE/api/reports -H 'Content-Type: application/json' -d '{"username":"sara_test","reason":"spam","details":"تست گزارش"}'
echo ""

echo "=== 17. Block sara_test by A ==="
curl -s -b $JAR_A -X POST $BASE/api/blocks -H 'Content-Type: application/json' -d '{"username":"sara_test"}'
echo ""

echo "=== 18. B tries to message A (blocked) ==="
curl -s -b $JAR_B -X POST $BASE/api/conversations -H 'Content-Type: application/json' -d '{"username":"ali_test"}'
echo ""

echo "=== 19. Admin reports ==="
curl -s -b /tmp/sukot_admin.txt $BASE/api/admin/reports | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps([{'reported': r['reported']['username'] if r['reported'] else None, 'reason': r['reason'], 'status': r['status']} for r in d['reports']], ensure_ascii=False))"

echo "=== 20. Presence ==="
curl -s -b $JAR_A $BASE/api/presence
echo ""

echo ""
echo "ALL API TESTS DONE"
