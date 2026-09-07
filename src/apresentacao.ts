import "./style.css";
import { api, salvarToken } from "./api";
import {
  iniciarInterface,
  estaAutenticado,
  destinoAposLogin,
} from "./autenticacao";
import { mensagemErro, setBtnCarregando } from "./utilitarios";
iniciarInterface();
const form = document.getElementById("form-auth") as HTMLFormElement;
const btn = document.getElementById("btn-auth") as HTMLButtonElement;
const email = document.getElementById("auth-email") as HTMLInputElement;
const senha = document.getElementById("auth-password") as HTMLInputElement;
const nome = document.getElementById("auth-username") as HTMLInputElement;
const erro = document.getElementById("erro-auth")!;
let cadastro = false;
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((tab) =>
  tab.addEventListener("click", () => {
    if (btn.disabled) return;
    cadastro = tab.dataset.mode === "cadastro";
    document
      .querySelectorAll<HTMLButtonElement>("[data-mode]")
      .forEach((t) => t.setAttribute("aria-pressed", String(t === tab)));
    document.getElementById("campo-username")!.hidden = !cadastro;
    nome.required = cadastro;
    senha.autocomplete = cadastro ? "new-password" : "current-password";
    btn.textContent = cadastro ? "Criar conta" : "Entrar na conta";
    erro.hidden = true;
  }),
);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (btn.disabled || !form.reportValidity()) return;
  erro.hidden = true;
  if (new TextEncoder().encode(senha.value).length > 72) {
    erro.textContent =
      "A senha deve ter até 72 bytes. Use menos caracteres, especialmente acentos e emojis.";
    erro.hidden = false;
    return;
  }
  setBtnCarregando(btn, true);
  try {
    if (cadastro) {
      const resposta = await api.auth.registrar(
        nome.value.trim(),
        email.value.trim(),
        senha.value,
      );
      salvarToken(resposta.token.access_token);
      sessionStorage.setItem(
        "lean-metrics-user",
        JSON.stringify({ username: resposta.username, email: resposta.email }),
      );
    } else {
      const resposta = await api.auth.login(email.value.trim(), senha.value);
      salvarToken(resposta.access_token);
      sessionStorage.setItem(
        "lean-metrics-user",
        JSON.stringify({
          username: email.value.trim(),
          email: email.value.trim(),
        }),
      );
    }
    senha.value = "";
    location.assign(destinoAposLogin());
  } catch (falha) {
    erro.textContent = mensagemErro(falha);
    erro.hidden = false;
  } finally {
    setBtnCarregando(btn, false);
  }
});
if (new URLSearchParams(location.search).has("expirada")) {
  erro.textContent = "Sua sessão expirou. Entre novamente para continuar.";
  erro.hidden = false;
}
if (new URLSearchParams(location.search).has("entrar") && !estaAutenticado()) {
  document.getElementById("acesso")!.scrollIntoView();
  email.focus({ preventScroll: true });
}
