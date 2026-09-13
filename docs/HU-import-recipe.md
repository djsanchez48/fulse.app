# RecepIA — Plan: Importar receta (copiar y pegar + OCR)

## Estado: Implementado ✅

- **recipe-parser.ts**: DeepSeek extrae y estructura recetas de texto pegado
- **/api/ai/parse-recipe**: POST { text: string } → ParsedRecipeResult
- **/api/ai/ocr-recipe**: POST { image: base64 } → OCR con Anthropic → parser → resultado
- **UI**: Tabs Generar / Importar en página Crear, textarea + botón "Reconocer receta" + botón cámara
- **Warnings + confidence**: banner de advertencia, confianza baja aviso
- **Badge "Importada"**: visible en cards del listado
- **i18n**: claves `import.*` en ES y EN
