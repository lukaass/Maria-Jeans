# Maria Jeans - Sistema de Gestão

Este é o sistema de gestão da loja Maria Jeans, desenvolvido com React, Vite e Tailwind CSS.

## Como rodar localmente

1. Clone o repositório.
2. Instale as dependências: `npm install`
3. Inicie o servidor de desenvolvimento: `npm run dev`
4. Abra o navegador em `http://localhost:3000`

## Como publicar na Vercel

1. Crie uma conta na [Vercel](https://vercel.com).
2. Conecte sua conta do GitHub.
3. Clique em **"Add New"** -> **"Project"**.
4. Importe este repositório.
5. A Vercel detectará automaticamente que é um projeto Vite.
6. Clique em **"Deploy"**.

## Observações sobre os dados

Atualmente, o sistema utiliza o `localStorage` do navegador para salvar os dados (estoque, vendas, perfil). Isso significa que:
- Os dados ficam salvos apenas no navegador/dispositivo onde você está usando o app.
- Se você limpar o cache do navegador, os dados serão perdidos.
- Para um sistema com banco de dados compartilhado entre vários dispositivos, seria necessário implementar um backend (ex: Firebase ou Supabase).
