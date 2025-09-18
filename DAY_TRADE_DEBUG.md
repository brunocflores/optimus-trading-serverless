# Debug Day Trade - Instruções

## 🐛 Problema Identificado
O sistema Day Trade não está salvando trades no Firestore.

## 🔧 Solução: Atualizar Regras do Firestore

### 1. Acesse o Firebase Console
- URL: https://console.firebase.google.com
- Projeto: `optimuspy-54238`

### 2. Atualize as Regras do Firestore
1. Navegue para **Firestore Database → Regras**
2. **SUBSTITUA** as regras atuais por uma das opções abaixo:

#### Opção A: Regras Temporárias (Recomendado para Debug)
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORÁRIO - Permitir tudo para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Opção B: Regras de Produção (Mais Seguras)
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Portfolio collection
    match /portfolio/{document} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
    }

    // Transactions collection
    match /transactions/{document} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
    }

    // Day trades collection - NOVA COLEÇÃO
    match /day-trades/{document} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
    }
  }
}
```

3. Clique em **"Publicar"**
4. Aguarde confirmação de que as regras foram atualizadas

## 🧪 Como Testar

### 1. Limpe o Cache do Navegador
- Pressione `Ctrl + Shift + R` para forçar reload
- Ou: `F12 → Application → Storage → Clear Storage`

### 2. Teste o Day Trade
1. Acesse o app: http://127.0.0.1:3000
2. Faça login
3. Clique na aba **"Day Trade"**
4. Clique **"+ Adicionar Trade"**
5. Preencha:
   - Data: (qualquer data)
   - Ativo: PETR4
   - Operação: Compra
   - Resultado: 150.00
6. Clique **"Adicionar Trade"**

### 3. Verifique os Logs (F12)
Abra o Console do navegador e procure por:
- ✅ `🎯 Setting up day trade event listeners...`
- ✅ `📈 Adding day trade...`
- ✅ `💾 Saving trade data to Firestore:`
- ✅ `✅ Trade saved successfully with ID:`

### 4. Possíveis Erros
- ❌ `permission-denied` = Regras não atualizadas
- ❌ `Form elements not found` = Problema no HTML
- ❌ `Missing form elements` = IDs incorretos

## 🔍 Debug Adicional

### Console Logs Implementados:
- Inicialização dos event listeners
- Validação de formulário
- Dados sendo enviados
- Confirmação de salvamento
- Erros detalhados

### Estrutura Esperada no Firestore:
```javascript
// Collection: day-trades
{
  userId: "user-uid-here",
  tradeDate: "2025-09-16",
  symbol: "PETR4",
  operation: "compra",
  result: 150.00,
  createdAt: "2025-09-16T16:30:00.000Z",
  type: "day-trade"
}
```

## ⚡ Status dos Arquivos
- ✅ `js/day-trade.js` - Criado com logs debug
- ✅ `index.html` - Modal e tela Day Trade
- ✅ `css/styles.css` - Estilos implementados
- ✅ `firestore.rules` - Regras atualizadas
- ⏳ **Firebase Console** - Aguardando atualização das regras

## 📞 Próximos Passos
1. **Configure as regras** conforme instruções acima
2. **Teste novamente** o Day Trade
3. **Verifique o console** para logs detalhados
4. **Confirme** se aparecem dados na aba Day Trade

---
**🎯 Após configurar as regras, teste e me informe se o trade foi salvo!**