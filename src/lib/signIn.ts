export async function signIn(
  provider?: any,
  options?: any,
  authorizationParams?: any,
): Promise<any> {
  const { callbackUrl = window.location.href, redirect = true } = options ?? {};

  const baseUrl = "localhost:3000";

  const isCredentials = true;
  const isSupportingReturn = isCredentials;

  const signInUrl = `${baseUrl}/${
    isCredentials ? "callback" : "signin"
  }/${provider}`;

  const _signInUrl = `${signInUrl}${authorizationParams ? `?${new URLSearchParams(authorizationParams)}` : ""}`;

  const res = await fetch(_signInUrl, {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      ...options,
      csrfToken: "csrfToken", // TODO: Add csrfToken
      callbackUrl,
      json: true,
    }),
  });

  const data = await res.json();

  // TODO: Do not redirect for Credentials and Email providers by default in next major
  if (redirect || !isSupportingReturn) {
    const url = data.url ?? callbackUrl;
    window.location.href = url;
    // If url contains a hash, the browser does not reload the page. We reload manually
    if (url.includes("#")) window.location.reload();
    return;
  }

  const error = new URL(data.url).searchParams.get("error");

  if (res.ok) {
    console.log("res.ok", res.ok);
  }

  return {
    error,
    status: res.status,
    ok: res.ok,
    url: error ? null : data.url,
  } as any;
}
