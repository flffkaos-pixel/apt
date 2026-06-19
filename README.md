# 🏠 아파트 실거래가 & 동네정보 분석 서비스

국토교통부 실거래가 + 에어코리아 + 카카오맵을 활용한 아파트/동네 분석 웹사이트.

## 기능

- **실거래가 조회** — 국토교통부 아파트 매매/전월세 실거래가
- **지도 표시** — 아파트 위치를 지도에서 한눈에
- **가격 추이 차트** — 월별 평균 실거래가 추이
- **주변 생활정보** — 미세먼지, 지하철, 학교, 편의시설
- **아파트명 검색** — 키워드로 아파트 검색

## 준비물

1. **공공데이터포털 API 키** — https://www.data.go.kr/ → 회원가입 → '국토교통부 아파트 매매 실거래가', '에어코리아' API 활용신청
2. **카카오 REST API 키** — https://developers.kakao.com/ → 앱 생성 → REST API 키

## 시작하기

```bash
# 의존성 설치
npm install

# .env 파일에 API 키 입력
# PUBLIC_DATA_API_KEY=공공데이터포털_키
# KAKAO_REST_API_KEY=카카오_REST_API_키

# 실행
npm start
```

브라우저에서 `http://localhost:3000` 열기.

## 기술 스택

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS + Leaflet + Chart.js
- **APIs**: 국토교통부 실거래가, 에어코리아, 카카오 로컬
