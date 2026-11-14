# V7 GUIDE — VOCALOID7 Editor 쉬운 사용설명서

VOCALOID7 Editor Reference Manual (V7.0.0)을 한국어로 쉽게 정리한 비공식 가이드 사이트입니다.

| 페이지 | 파일 | 내용 |
|---|---|---|
| `/` | `index.html` | 랜딩 페이지 |
| `/guide` | `guide.html` + `app.js` | 16챕터 가이드, 검색(`/`), 단축키·발음기호표 |
| `/converter` | `converter.html` + `converter.js` + `midi.js` | 한국어 → 일본어/영어/혼합 발음 변환기, MIDI → .vpr / 가사 .mid 변환 |
| `/game` | `game.html` + `game.js` | 단축키 4지선다 타임어택 게임 |

공통: `styles.css`, `pages.css`, `data.js`(단축키·파라미터·발음기호 데이터). 빌드 과정 없는 정적 사이트.

## 로컬에서 보기
`index.html`을 브라우저로 열거나 `python3 -m http.server` 실행 후 http://localhost:8000

## Vercel 배포
1. 이 저장소를 GitHub에 푸시
2. https://vercel.com/new → 저장소 Import → Framework Preset: **Other** → Deploy
   (Build Command·Output Directory 비워두기)

VOCALOID는 Yamaha Corporation의 상표입니다.
