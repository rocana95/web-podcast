# El Enjambre

## Producción
```
    docker-compose up -d
```
### Debe incluir el token del BOT en el fichero: **token_bot_secret.ini**

*Por ahora solo ejecuta el BOT utilizando una imagen de PM2 con node 10.*


## Desarrollo
### Instalar las dependencias
```
npm install
```

### Compilar la plantilla el sitio web del podcast
```
npm run build
```

### Ejecutar el sitio web del podcast
```
node index.js
```

### Ejecutar el BOT de telegram que descarga los episodios
```
node telegramBot.js
```
### Debe incluir el token del BOT en el fichero: **token_bot_secret_test.ini**

