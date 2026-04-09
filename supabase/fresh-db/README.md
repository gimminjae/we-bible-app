# Fresh DB SQL Guide

`supabase/schema.sql` 과 `supabase/migrations/*` 를 기준으로, 현재 `we-bible-app`의 최종 DB 상태를 "새 DB를 처음 만드는 경우"에 맞게 다시 정리한 폴더입니다.

## 언제 쓰면 되나요?

- 새 Supabase 프로젝트를 만들고 처음부터 스키마를 세팅할 때
- 기존 migration 이력 대신 최종 상태만 한 번에 적용하고 싶을 때

## 언제 쓰면 안 되나요?

- 이미 운영/개발 중인 기존 DB에 변경을 이어서 적용할 때
- 기존 DB에는 계속 `supabase/migrations/*` 를 사용해야 합니다.

## 실행 순서

1. `01_tables.sql`
2. `02_indexes.sql`
3. `03_functions_helpers.sql`
4. `04_functions_sync.sql`
5. `05_functions_rpc.sql`
6. `06_triggers.sql`
7. `07_grants.sql`
8. `08_rls.sql`

## 기준

- `supabase/schema.sql`
- `supabase/migrations/202603310001_church_admin_transfer_and_account_delete.sql`
- `supabase/migrations/202603310002_fix_delete_my_account_shared_plan_owner.sql`
- `supabase/migrations/202604010001_add_church_description_and_update_info.sql`
- `supabase/migrations/202604010002_add_user_profile_show_email.sql`
- `supabase/migrations/202604090001_add_developer_inquiries.sql`

## 참고

- `auth.users` 는 Supabase Auth 기본 테이블이 이미 존재한다고 가정합니다.
- 별도 seed 데이터는 현재 프로젝트 기준으로 포함하지 않았습니다.
- 이 폴더는 "최종 정리본"이고, migration 이력 보존용 폴더는 아닙니다.
