/* Shared API client.
   Local development uses localhost:5000. For Netlify, set HIH_API_BASE in
   config.js to the deployed backend URL ending in /api.
   A browser override in localStorage is also supported for quick testing. */
const configuredApiBase = (window.HIH_API_BASE || "").trim();
const localApiBase = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:5000/api"
  : "";
const API_BASE = (localStorage.getItem("hih_api_base") || configuredApiBase || localApiBase).replace(/\/$/, "");

const Api = {
  token(){return localStorage.getItem("hih_token")},
  user(){try{return JSON.parse(localStorage.getItem("hih_user")||"null")}catch{return null}},
  async request(path, options={}){
    if(!API_BASE) {
      throw new Error("The Health in Hand backend is not configured for this website yet. Deploy the server and set HIH_API_BASE in client/js/config.js to your backend URL ending in /api.");
    }
    const headers={...(options.headers||{})};
    if(this.token()) headers.Authorization=`Bearer ${this.token()}`;
    const activeProfile=localStorage.getItem("hih_profile_id");
    if(activeProfile) headers["X-Profile-ID"]=activeProfile;
    if(options.body && !(options.body instanceof FormData)) headers["Content-Type"]="application/json";
    let response;
    try {
      response=await fetch(`${API_BASE}${path}`,{...options,headers});
    } catch (error) {
      throw new Error(`Cannot reach the Health in Hand backend at ${API_BASE}. Check that the backend is deployed and running, and that its CLIENT_ORIGIN includes this website's Netlify URL.`);
    }
    const data=await response.json().catch(()=>({message:"The server returned an unreadable response."}));
    if(!response.ok) throw new Error(data.message||`Request failed (${response.status})`);
    return data;
  },
  get(path,headers={}){return this.request(path,{headers})},
  post(path,body,headers={}){return this.request(path,{method:"POST",body:body instanceof FormData?body:JSON.stringify(body),headers})},
  del(path){return this.request(path,{method:"DELETE"})},
  patch(path,body){return this.request(path,{method:"PATCH",body:JSON.stringify(body)})},
  fileUrl(path){if(!API_BASE) throw new Error("Backend URL is not configured.");return `${API_BASE}${path}`},
  setSession(data){localStorage.setItem("hih_token",data.token);localStorage.setItem("hih_user",JSON.stringify(data.user))},
  clearSession(){localStorage.removeItem("hih_token");localStorage.removeItem("hih_user")}
};
