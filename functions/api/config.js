export async function onRequest(context) {
  return new Response(JSON.stringify({
    kakaoJsKey: context.env.KAKAO_JS_KEY || '',
    kakaoRestKey: context.env.KAKAO_REST_API_KEY || ''
  }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
  });
}
