import { Plugin } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';

export function consoleLogPlugin(): Plugin {
  let wss: WebSocketServer;
  
  return {
    name: 'console-log-plugin',
    configureServer(server) {
      // Criar WebSocket server na porta 3001
      wss = new WebSocketServer({ port: 3001 });
      
      wss.on('connection', (ws: WebSocket) => {
        console.log('🔌 [CONSOLE-BRIDGE] Cliente conectado');
        
        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Formatar e exibir no terminal
            const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
            const prefix = message.type === 'error' ? '❌' : 
                          message.type === 'warn' ? '⚠️' : 
                          message.type === 'info' ? 'ℹ️' : '📝';
            
            console.log(`${prefix} [${timestamp}] [BROWSER]`, ...message.args);
          } catch (e) {
            console.error('Erro ao processar mensagem:', e);
          }
        });
        
        ws.on('close', () => {
          console.log('🔌 [CONSOLE-BRIDGE] Cliente desconectado');
        });
      });
      
      console.log('✅ [CONSOLE-BRIDGE] WebSocket server rodando na porta 3001');
    },
    transformIndexHtml() {
      // Injetar script no HTML para capturar console.log
      return [
        {
          tag: 'script',
          injectTo: 'head',
          children: `
            (function() {
              let ws;
              let reconnectInterval;
              
              function connect() {
                try {
                  ws = new WebSocket('ws://localhost:3001');
                  
                  ws.onopen = () => {
                    console.log('🔌 Console bridge conectado ao terminal');
                    if (reconnectInterval) {
                      clearInterval(reconnectInterval);
                      reconnectInterval = null;
                    }
                  };
                  
                  ws.onclose = () => {
                    console.log('🔌 Console bridge desconectado, tentando reconectar...');
                    if (!reconnectInterval) {
                      reconnectInterval = setInterval(connect, 2000);
                    }
                  };
                  
                  ws.onerror = (err) => {
                    console.error('Erro no WebSocket:', err);
                  };
                } catch (e) {
                  console.error('Erro ao conectar WebSocket:', e);
                }
              }
              
              connect();
              
              // Interceptar console.log, console.error, console.warn
              const originalLog = console.log;
              const originalError = console.error;
              const originalWarn = console.warn;
              
              function sendToTerminal(type, args) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  try {
                    // Converter argumentos para strings
                    const serializedArgs = Array.from(args).map(arg => {
                      if (typeof arg === 'object') {
                        try {
                          return JSON.stringify(arg, null, 2);
                        } catch (e) {
                          return String(arg);
                        }
                      }
                      return String(arg);
                    });
                    
                    ws.send(JSON.stringify({
                      type: type,
                      args: serializedArgs,
                      timestamp: Date.now()
                    }));
                  } catch (e) {
                    // Silenciar erros de envio
                  }
                }
              }
              
              console.log = function(...args) {
                originalLog.apply(console, args);
                sendToTerminal('log', args);
              };
              
              console.error = function(...args) {
                originalError.apply(console, args);
                sendToTerminal('error', args);
              };
              
              console.warn = function(...args) {
                originalWarn.apply(console, args);
                sendToTerminal('warn', args);
              };
            })();
          `
        }
      ];
    }
  };
}
