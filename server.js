require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const TRADE_API_URL = process.env.TRADE_API_URL || 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';
const RENT_API_URL = process.env.RENT_API_URL || 'http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptRent';

// 국토교통부 아파트 매매 실거래가 API
app.get('/api/trade', async (req, res) => {
  try {
    const { lawdCd, dealYmd, pageNo = 1, numOfRows = 100 } = req.query;
    if (!lawdCd || !dealYmd) {
      return res.status(400).json({ error: 'lawdCd(법정동코드 5자리)와 dealYmd(YYYYMM)는 필수입니다.' });
    }
    const response = await axios.get(TRADE_API_URL, {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        pageNo,
        numOfRows
      }
    });
    res.json(response.data);
  } catch (err) {
    const detail = err.response?.data;
    const detailStr = typeof detail === 'string' ? detail.substring(0, 300) : JSON.stringify(detail);
    console.error('Trade API error:', err.response?.status, detailStr);
    res.status(500).json({ error: err.message, detail: detailStr });
  }
});

// 국토교통부 아파트 전월세 실거래가 API
app.get('/api/rent', async (req, res) => {
  try {
    const { lawdCd, dealYmd, pageNo = 1, numOfRows = 100 } = req.query;
    if (!lawdCd || !dealYmd) {
      return res.status(400).json({ error: 'lawdCd(법정동코드 5자리)와 dealYmd(YYYYMM)는 필수입니다.' });
    }
    const url = 'http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcAptRent';
    const response = await axios.get(url, {
      params: {
        serviceKey: process.env.PUBLIC_DATA_API_KEY,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        pageNo,
        numOfRows
      }
    });
    const json = parser.parse(response.data);
    res.json(json);
  } catch (err) {
    console.error('Rent API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 에어코리아 실시간 대기오염정보
app.get('/api/air', async (req, res) => {
  try {
    const { sidoName = '서울' } = req.query;
    const url = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';
    const response = await axios.get(url, {
      params: {
        serviceKey: process.env.AIR_API_KEY || process.env.PUBLIC_DATA_API_KEY,
        returnType: 'json',
        numOfRows: 100,
        pageNo: 1,
        sidoName,
        ver: '1.0'
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Air API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 카카오 주소→좌표 변환 (Kakao Local API)
app.get('/api/geocode', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query는 필수입니다.' });
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
      params: { query }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Geocode API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 카카오 키워드 장소 검색
app.get('/api/places', async (req, res) => {
  try {
    const { query, x, y, radius = 1000 } = req.query;
    if (!query || !x || !y) return res.status(400).json({ error: 'query, x, y는 필수입니다.' });
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
      params: { query, x, y, radius }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Places API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 법정동코드 목록 (행정안전부)
app.get('/api/codes', async (req, res) => {
  try {
    const { regExp = '^11' } = req.query;
    const url = 'https://www.data.go.kr/api/fileDown.do?atchFileId=FILE_000000002020600&fileSn=2';
    const response = await axios.get(url, { responseType: 'text' });
    const lines = response.data.split('\n').filter(Boolean);
    const codes = lines.slice(1).map(line => {
      const parts = line.split('\t');
      return { code: parts[0]?.trim(), name: parts[1]?.trim() };
    }).filter(c => c.code && c.name && c.code.match(new RegExp(regExp)) && c.code.endsWith('00000'));
    res.json(codes);
  } catch (err) {
    console.error('Codes API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 모든 라우트를 index.html로 fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏠 APT 분석 서버 실행 중: http://localhost:${PORT}`);
});
