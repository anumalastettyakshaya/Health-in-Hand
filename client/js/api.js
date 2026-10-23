/* Shared API client. Configure API_BASE if the backend is hosted elsewhere. */
const API_BASE = (localStorage.getItem("hih_api_base") || ((location.hostname === "localhost" || location.hostname === "127.0.0.1") ? "http://localhost:5000/api" : `${location.protocol}//${location.hostname}:5000/api`)).replace(/\/$/, "");
const Api = {
  token(){return localStorage.getItem("hih_token")},
  user(){try{return JSON.parse(localStorage.getItem("hih_user")||"null")}catch{return null}},
  async request(path, options={}){
    const headers={...(options.headers||{})};
    if(this.token()) headers.Authorization=`Bearer ${this.token()}`;
    const activeProfile=localStorage.getItem("hih_profile_id");
    if(activeProfile) headers["X-Profile-ID"]=activeProfile;
    if(options.body && !(options.body instanceof FormData)) headers["Content-Type"]="application/json";
    let response;
    try { response=await fetch(`${API_BASE}${path}`,{...options,headers}); }
    catch (error) { throw new Error(`Cannot reach the Health in Hand API at ${API_BASE}. Make sure the server is running on port 5000 and open the frontend with Live Server. If it is running, check CLIENT_ORIGIN in server/.env.`); }
    const data=await response.json().catch(()=>({message:"The server returned an unreadable response."}));
    if(!response.ok) throw new Error(data.message||`Request failed (${response.status})`);
    return data;
  },
  get(path,headers={}){return this.request(path,{headers})},
  post(path,body,headers={}){return this.request(path,{method:"POST",body:body instanceof FormData?body:JSON.stringify(body),headers})},
  del(path){return this.request(path,{method:"DELETE"})},
  patch(path,body){return this.request(path,{method:"PATCH",body:JSON.stringify(body)})},
  fileUrl(path){return `${API_BASE}${path}`},
  setSession(data){localStorage.setItem("hih_token",data.token);localStorage.setItem("hih_user",JSON.stringify(data.user))},
  clearSession(){localStorage.removeItem("hih_token");localStorage.removeItem("hih_user")}
};
