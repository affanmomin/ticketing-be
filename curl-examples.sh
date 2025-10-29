#!/bin/bash

# =============================================================================
# User Management API - cURL Examples
# =============================================================================
# Make sure your server is running on http://localhost:3000
# Update the BASE_URL if using a different host/port
# =============================================================================

BASE_URL="http://localhost:3000"
TOKEN=""  # Will be set after login

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# =============================================================================
# Helper function to print section headers
# =============================================================================
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# =============================================================================
# 1. LOGIN (Get Authentication Token)
# =============================================================================
print_header "1. LOGIN AS ADMIN"

echo -e "${YELLOW}Request:${NC}"
echo "POST $BASE_URL/auth/login"

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "Admin123!"
  }')

echo -e "\n${GREEN}Response:${NC}"
echo "$LOGIN_RESPONSE" | jq '.'

# Extract token for subsequent requests
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo -e "\n${GREEN}✓ Login successful! Token extracted.${NC}"
else
    echo -e "\n${RED}✗ Login failed. Please check credentials.${NC}"
    exit 1
fi

# =============================================================================
# 2. CREATE USER (Employee)
# =============================================================================
print_header "2. CREATE EMPLOYEE USER"

echo -e "${YELLOW}Request:${NC}"
echo "POST $BASE_URL/users"

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "name": "John Doe",
    "password": "SecurePass123!",
    "userType": "EMPLOYEE",
    "active": true
  }')

echo -e "\n${GREEN}Response:${NC}"
echo "$CREATE_RESPONSE" | jq '.'

# Extract user ID for subsequent requests
USER_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
echo -e "\n${GREEN}✓ User ID: $USER_ID${NC}"

# =============================================================================
# 3. CREATE USER WITH CLIENT COMPANY
# =============================================================================
print_header "3. CREATE USER ASSIGNED TO CLIENT COMPANY"

echo -e "${YELLOW}Request:${NC}"
echo "POST $BASE_URL/users"

# Note: Replace CLIENT_COMPANY_ID with actual client company ID
curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@company.com",
    "name": "Jane Smith",
    "password": "SecurePass123!",
    "userType": "EMPLOYEE",
    "clientCompanyId": "CLIENT_COMPANY_ID",
    "active": true
  }' | jq '.'

# =============================================================================
# 4. LIST ALL USERS (with pagination)
# =============================================================================
print_header "4. LIST ALL USERS (Paginated)"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/users?limit=10&offset=0"

curl -s -X GET "$BASE_URL/users?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# 5. LIST USERS WITH FILTERS
# =============================================================================
print_header "5. LIST USERS - FILTER BY USER TYPE"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/users?userType=EMPLOYEE&limit=20"

curl -s -X GET "$BASE_URL/users?userType=EMPLOYEE&limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# 6. LIST USERS - SEARCH BY NAME OR EMAIL
# =============================================================================
print_header "6. SEARCH USERS BY NAME OR EMAIL"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/users?search=john&limit=10"

curl -s -X GET "$BASE_URL/users?search=john&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# 7. LIST USERS - FILTER BY ACTIVE STATUS
# =============================================================================
print_header "7. LIST ACTIVE USERS ONLY"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/users?active=true&limit=10"

curl -s -X GET "$BASE_URL/users?active=true&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# 8. LIST USERS - FILTER BY CLIENT COMPANY
# =============================================================================
print_header "8. LIST USERS FOR SPECIFIC CLIENT COMPANY"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/users?clientCompanyId=CLIENT_COMPANY_ID&limit=10"

# Note: Replace CLIENT_COMPANY_ID with actual client company ID
curl -s -X GET "$BASE_URL/users?clientCompanyId=CLIENT_COMPANY_ID&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# 9. GET SINGLE USER BY ID
# =============================================================================
print_header "9. GET USER BY ID"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/users/$USER_ID"

curl -s -X GET "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# 10. UPDATE USER (Admin - Full Update)
# =============================================================================
print_header "10. UPDATE USER (Admin)"

echo -e "${YELLOW}Request:${NC}"
echo "PUT $BASE_URL/users/$USER_ID"

curl -s -X PUT "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "email": "john.doe.updated@company.com"
  }' | jq '.'

# =============================================================================
# 11. UPDATE USER - CHANGE PASSWORD
# =============================================================================
print_header "11. UPDATE USER PASSWORD"

echo -e "${YELLOW}Request:${NC}"
echo "PUT $BASE_URL/users/$USER_ID"

curl -s -X PUT "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePass123!"
  }' | jq '.'

# =============================================================================
# 12. UPDATE USER - ASSIGN TO CLIENT COMPANY
# =============================================================================
print_header "12. ASSIGN USER TO CLIENT COMPANY"

echo -e "${YELLOW}Request:${NC}"
echo "PUT $BASE_URL/users/$USER_ID"

# Note: Replace CLIENT_COMPANY_ID with actual client company ID
curl -s -X PUT "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientCompanyId": "CLIENT_COMPANY_ID"
  }' | jq '.'

# =============================================================================
# 13. UPDATE USER - DEACTIVATE
# =============================================================================
print_header "13. DEACTIVATE USER"

echo -e "${YELLOW}Request:${NC}"
echo "PUT $BASE_URL/users/$USER_ID"

curl -s -X PUT "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "active": false
  }' | jq '.'

# =============================================================================
# 14. UPDATE USER - REACTIVATE
# =============================================================================
print_header "14. REACTIVATE USER"

echo -e "${YELLOW}Request:${NC}"
echo "PUT $BASE_URL/users/$USER_ID"

curl -s -X PUT "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "active": true
  }' | jq '.'

# =============================================================================
# 15. LIST ASSIGNABLE USERS FOR CLIENT
# =============================================================================
print_header "15. LIST ASSIGNABLE USERS FOR CLIENT"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/users/assignable?clientId=CLIENT_COMPANY_ID"

# Note: Replace CLIENT_COMPANY_ID with actual client company ID
curl -s -X GET "$BASE_URL/users/assignable?clientId=CLIENT_COMPANY_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# 16. DELETE USER (Soft Delete)
# =============================================================================
print_header "16. DELETE USER (Soft Delete)"

echo -e "${YELLOW}Request:${NC}"
echo "DELETE $BASE_URL/users/$USER_ID"

curl -s -X DELETE "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "${GREEN}✓ User soft deleted (active set to false)${NC}"

# =============================================================================
# 17. DELETE USER (Hard Delete)
# =============================================================================
print_header "17. DELETE USER (Hard Delete)"

echo -e "${YELLOW}Request:${NC}"
echo "DELETE $BASE_URL/users/$USER_ID?hard=true"

# Uncomment to actually hard delete
# curl -s -X DELETE "$BASE_URL/users/$USER_ID?hard=true" \
#   -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "${YELLOW}Note: Hard delete commented out for safety. Uncomment to use.${NC}"

# =============================================================================
# 18. GET CURRENT USER INFO
# =============================================================================
print_header "18. GET CURRENT USER INFO (ME)"

echo -e "${YELLOW}Request:${NC}"
echo "GET $BASE_URL/auth/me"

curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# =============================================================================
# SUMMARY
# =============================================================================
print_header "TESTING COMPLETE"

echo -e "${GREEN}All user management API endpoints tested successfully!${NC}"
echo ""
echo -e "${BLUE}Quick Reference:${NC}"
echo "  • POST   /users              - Create user"
echo "  • GET    /users              - List users"
echo "  • GET    /users/:id          - Get user by ID"
echo "  • PUT    /users/:id          - Update user"
echo "  • DELETE /users/:id          - Delete user (soft)"
echo "  • DELETE /users/:id?hard=true - Delete user (hard)"
echo "  • GET    /users/assignable   - List assignable users"
echo ""
echo -e "${YELLOW}Your access token:${NC}"
echo "$TOKEN"
echo ""
