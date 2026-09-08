import "./style.css";
import { iniciarInterface } from "./autenticacao";
void iniciarInterface();
if (new URLSearchParams(location.search).has("expirada")) {
  const aviso = document.getElementById("auth-feedback")!;
  aviso.textContent = "Sua sessão expirou. Entre com GitHub novamente para continuar.";
  aviso.hidden = false;
}
if (new URLSearchParams(location.search).has("entrar")) document.getElementById("acesso")!.scrollIntoView();
