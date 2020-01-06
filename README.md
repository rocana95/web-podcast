# El Enjambre

## Producción
```
    docker-compose up -d
```
### Debe incluir el token del BOT en el fichero: **token_bot_secret.ini**

## Desarrollo

### Ejecutar el sitio web del podcast
```
node index.js
```

### Compilar la plantilla el sitio web del podcast
```
npm run build
```

### Ejecutar el BOT de telegram que descarga los episodios
```
node telegramBot.js
```
### Debe incluir el tokens del BOT en el fichero: **token_bot_secret_test.ini**

