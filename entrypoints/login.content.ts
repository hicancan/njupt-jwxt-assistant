import { defineContentScript } from 'wxt/sandbox';
import { credentialsItem, type Credentials } from '@/utils/hooks';

export default defineContentScript({
    matches: [
        "*://jwxt.njupt.edu.cn/",
        "*://jwxt.njupt.edu.cn/default*.aspx*",
        "*://202.119.225.134/",
        "*://202.119.225.134/default*.aspx*"
    ],
    main() {
        const LOGIN_CHECK_INTERVAL = 100
        const MAX_ATTEMPTS = 50
        let attempts = 0

        const timer = setInterval(() => {
            const idInput = document.getElementById("txtUserName") as HTMLInputElement | null
            const pwdInput = document.getElementById("TextBox2") as HTMLInputElement | null

            if (idInput && pwdInput) {
                clearInterval(timer)
                checkAndFill(idInput, pwdInput)
            } else {
                attempts++
                if (attempts >= MAX_ATTEMPTS) clearInterval(timer)
            }
        }, LOGIN_CHECK_INTERVAL)
    }
});

async function checkAndFill(idInput: HTMLInputElement, pwdInput: HTMLInputElement): Promise<void> {
    const creds = await credentialsItem.getValue();
    if (creds && creds.username) {
        fillLogin(creds, idInput, pwdInput)
    }
}

function fillLogin(creds: Credentials, idInput: HTMLInputElement, pwdInput: HTMLInputElement): void {
    idInput.value = creds.username
    if (creds.password) pwdInput.value = creds.password

    const stuRadio = document.getElementById("RadioButtonList1_2") as HTMLInputElement | null
    if (stuRadio) stuRadio.checked = true

    const codeInput = document.getElementById("txtSecretCode") as HTMLInputElement | null
    const btnLogin = document.getElementById("Button1") as HTMLInputElement | null

    if (codeInput) {
        codeInput.focus()
        codeInput.addEventListener("keyup", function (e: KeyboardEvent) {
            if ((this as HTMLInputElement).value.length === 4 || e.key === 'Enter') {
                if (btnLogin) btnLogin.click()
            }
        })
    }
}
