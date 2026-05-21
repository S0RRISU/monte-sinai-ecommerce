# Deploy rápido a partir do VS Code

Opções fornecidas neste repositório:

- **Task:** `Deploy: Commit & Push (Git)` — faz `git add -A`, `git commit -m "deploy: timestamp"` (se houver mudanças) e `git push`.
- **Task:** `Deploy: Netlify CLI (prod)` — usa Netlify CLI (ou `npx netlify`) para publicar o diretório atual como produção. Usa a variável de ambiente `NETLIFY_SITE_ID`.

Como usar:

1. Preencha `.env` local com as variáveis necessárias (se for usar `deploy-netlify`), por exemplo `NETLIFY_SITE_ID`.
2. Abra o **Command Palette** (Ctrl+Shift+P) e execute `Tasks: Run Task` → escolha a task `Deploy: Commit & Push (Git)` ou `Deploy: Netlify CLI (prod)`.
3. Ou execute diretamente pelo menu `Terminal` → `Run Task...`.

Atalho (opcional): adicione um atalho no `keybindings.json` para rodar a task com uma tecla rápida. Exemplo:

```
{
  "key": "ctrl+alt+d",
  "command": "workbench.action.tasks.runTask",
  "args": "Deploy: Commit & Push (Git)"
}
```

Botão na barra de status (opcional):

- Instale uma extensão que permita criar botões ou executar comandos via settings (por ex. uma extensão de "command runner" ou "status bar buttons"). Configure-a para executar o comando:

```
workbench.action.tasks.runTask Deploy: Commit & Push (Git)
```

Notas:

- Se você usa Netlify conectado ao repositório (deploy por push), o fluxo `Commit & Push` atualiza automaticamente o site.
- Para o `Deploy: Netlify CLI (prod)` é necessário autenticar localmente: `netlify login` e definir `NETLIFY_SITE_ID`.
