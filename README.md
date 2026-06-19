# 🏠 아파트 실거래가 & 동네정보 분석 서비스

국토교통부 실거래가 + 에어코리아 + 카카오맵 기반 아파트/동네 분석 웹사이트.

## 기능

- 실거래가 조회 (매매/전월세)
- 지도 표시 (Leaflet + OpenStreetMap)
- 가격 추이 차트
- 주변 생활정보 (미세먼지, 지하철, 학교, 편의시설)

## 배포 (Cloudflare Pages + Functions)

1. 이 레포를 Cloudflare Pages에 연결

2. Pages 설정:
   - **Build output directory**: `public`
   - **Root directory**: (기본값)

3. 환경 변수 설정 (Pages > Settings > Environment variables):

   | 변수명 | 값 |
   |--------|-----|
   | `PUBLIC_DATA_API_KEY` | 공공데이터포털 API 키 |
   | `AIR_API_KEY` | 에어코리아 API 키 (같은 키면 생략 가능) |
   | `KAKAO_REST_API_KEY` | 카카오 REST API 키 |

4. 배포 후 `https://aptscouter.pages.dev` 접속

## 로컬 개발

```bash
npm install
npm start
# http://localhost:3000
```
