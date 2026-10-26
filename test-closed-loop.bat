@echo off
set "BASE=http://localhost:3000"

echo ==================================================
echo   HIS closed-loop curl test script
echo   Make sure backend is running: npm run dev
echo ==================================================
echo.

echo ---------- 1. Get tokens for 4 roles ----------

REM patient1 login -> PATIENT_TOKEN
for /f "delims=" %%A in ('curl -s -X POST "%BASE%/api/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"patient1\",\"password\":\"patient123\"}"') do set "R=%%A"
set "T=%R:*"token":"=%"
set "T=%T:"=%"
for /f "delims=," %%B in ("%T%") do set "PATIENT_TOKEN=%%B"
echo [patient1]    token OK

REM doctor1 login -> DOCTOR_TOKEN
for /f "delims=" %%A in ('curl -s -X POST "%BASE%/api/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"doctor1\",\"password\":\"doctor123\"}"') do set "R=%%A"
set "T=%R:*"token":"=%"
set "T=%T:"=%"
for /f "delims=," %%B in ("%T%") do set "DOCTOR_TOKEN=%%B"
echo [doctor1]     token OK

REM cashier1 login -> CASHIER_TOKEN
for /f "delims=" %%A in ('curl -s -X POST "%BASE%/api/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"cashier1\",\"password\":\"cashier123\"}"') do set "R=%%A"
set "T=%R:*"token":"=%"
set "T=%T:"=%"
for /f "delims=," %%B in ("%T%") do set "CASHIER_TOKEN=%%B"
echo [cashier1]   token OK

REM pharmacist1 login -> PHARMACIST_TOKEN
for /f "delims=" %%A in ('curl -s -X POST "%BASE%/api/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"pharmacist1\",\"password\":\"pharma123\"}"') do set "R=%%A"
set "T=%R:*"token":"=%"
set "T=%T:"=%"
for /f "delims=," %%B in ("%T%") do set "PHARMACIST_TOKEN=%%B"
echo [pharmacist1] token OK
echo.

echo ---------- 2. Patient queries schedule (doc01) ----------

for /f "delims=" %%A in ('curl -s "%BASE%/api/schedules?doctorId=doc01" -H "Authorization: Bearer %PATIENT_TOKEN%"') do set "R=%%A"
set "T=%R:*"id":"=%"
set "T=%T:"=%"
for /f "delims=," %%B in ("%T%") do set "SCHED_ID=%%B"
echo schedule id: %SCHED_ID%
echo.

echo ---------- 3. Patient registers (deduct quota) ----------

for /f "delims=" %%A in ('curl -s -X POST "%BASE%/api/registrations" -H "Content-Type: application/json" -H "Authorization: Bearer %PATIENT_TOKEN%" -d "{\"schedule_id\":\"%SCHED_ID%\"}"') do set "R=%%A"
set "T=%R:*"id":"=%"
set "T=%T:"=%"
for /f "delims=," %%B in ("%T%") do set "REG_ID=%%B"
echo registration id: %REG_ID%
echo.

echo ---------- 4. Doctor accepts (WAITING -^> CONSULTING) ----------

curl -s -X POST "%BASE%/api/doctor/registrations/%REG_ID%/accept" -H "Content-Type: application/json" -H "Authorization: Bearer %DOCTOR_TOKEN%" -d "{\"chief_complaint\":\"cough for 3 days\",\"diagnosis\":\"bronchitis\"}"
echo.
echo.

echo ---------- 5. Doctor prescribes (CONSULTING -^> COMPLETED) ----------

for /f "delims=" %%A in ('curl -s -X POST "%BASE%/api/doctor/prescriptions" -H "Content-Type: application/json" -H "Authorization: Bearer %DOCTOR_TOKEN%" -d "{\"registration_id\":\"%REG_ID%\",\"items\":[{\"drug_id\":\"drug05\",\"quantity\":2,\"dosage\":\"once a day\"},{\"drug_id\":\"drug06\",\"quantity\":1,\"dosage\":\"once a day\"}]}"') do set "R=%%A"
set "T=%R:*"id":"=%"
set "T=%T:"=%"
for /f "delims=," %%B in ("%T%") do set "RX_ID=%%B"
echo prescription id: %RX_ID%
echo.

echo ---------- 6. Cashier pays (PENDING -^> PAID) ----------

curl -s -X POST "%BASE%/api/cashier/payments" -H "Content-Type: application/json" -H "Authorization: Bearer %CASHIER_TOKEN%" -d "{\"prescription_id\":\"%RX_ID%\"}"
echo.
echo.

echo ---------- 7. Pharmacist dispenses (PAID -^> DISPENSED) ----------

curl -s -X POST "%BASE%/api/pharmacist/prescriptions/%RX_ID%/dispense" -H "Authorization: Bearer %PHARMACIST_TOKEN%"
echo.
echo.

echo ---------- 8. Patient checks prescription status ----------

curl -s "%BASE%/api/prescriptions/%RX_ID%" -H "Authorization: Bearer %PATIENT_TOKEN%"
echo.
echo.

echo ---------- 9. RBAC: patient calls doctor endpoint (expect 403) ----------

set /p =HTTP code: <nul
curl -s -o NUL -w "%%{http_code}" "%BASE%/api/doctor/registrations" -H "Authorization: Bearer %PATIENT_TOKEN%"
echo.
echo.

echo ==================================================
echo   Done
echo ==================================================
pause
