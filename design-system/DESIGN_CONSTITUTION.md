# Design Constitution

## Sistema global de dirección de arte para Stitch + Cursor

**Versión:** 1.0\
**Propósito:** establecer un estándar compartido de diseño para todos
los proyectos del equipo, sin forzar una estética uniforme entre marcas
o productos.

------------------------------------------------------------------------

## 1. Misión

Diseñar interfaces digitales con una identidad visual intencional,
profesional, reconocible y apropiada para su contexto. Evitar que los
resultados parezcan plantillas intercambiables generadas
automáticamente.

La calidad no se mide por cuántos efectos visuales tenga una interfaz,
sino por la relación entre propósito, contenido, composición, identidad,
usabilidad y ejecución.

### Principio central

**Compartimos criterios de calidad; no compartimos automáticamente la
misma apariencia.**

Una homepage comercial, un dashboard administrativo, un sistema de
inventario, una joyería y una plataforma energética pueden compartir
estándares de calidad sin compartir paleta, tipografía, densidad,
componentes ni personalidad.

------------------------------------------------------------------------

## 2. Roles de las herramientas

### Stitch

-   Explorar direcciones de arte y generar bocetos antes de implementar.
-   Crear variantes estructuralmente diferentes, no solo recolorear una
    misma plantilla.
-   Mantener los diseños y sistemas de diseño propios de cada proyecto.
-   No considerar una pantalla generada como aprobada hasta que el
    usuario la revise.

### Cursor

-   Leer esta constitución y el `DESIGN.md` del proyecto antes de
    generar o modificar UI.
-   Usar la skill adecuada al tipo de interfaz y al objetivo de la
    tarea.
-   Transmitir explícitamente a Stitch las restricciones relevantes; las
    reglas globales de Cursor no se inyectan automáticamente en Stitch.
-   Implementar el diseño aprobado respetando arquitectura, lógica,
    componentes y convenciones del repositorio.
-   No reemplazar silenciosamente la dirección de arte aprobada.

### Skills

-   **Taste / `taste-design`:** explorar una dirección estética
    distintiva, especialmente en páginas públicas, según las
    instrucciones concretas de esa skill.
-   **Impeccable:** criticar, dar forma y refinar interfaces según el
    brief, especialmente superficies de producto y aplicaciones.
-   **Skills de Stitch:** generar/editar pantallas, mejorar prompts y
    crear o gestionar `DESIGN.md` y sistemas de diseño.
-   No ejecutar varias skills con filosofías visuales incompatibles
    sobre la misma pantalla sin definir primero cuál gobierna y por qué.

### Playwright MCP

-   Inspeccionar la aplicación ejecutándose en navegador.
-   Probar interacciones, resoluciones y capturas.
-   Comparar la implementación con el diseño aprobado.
-   No asumir que una diferencia visual es un defecto sin analizar si es
    intencional.

------------------------------------------------------------------------

## 3. Proceso obligatorio antes de diseñar

Antes de generar una pantalla, el agente debe identificar:

1.  **Producto y dominio:** qué es, qué problema resuelve y qué lo hace
    distinto.
2.  **Audiencia y contexto:** quién lo usa, en qué situación y con qué
    nivel de experiencia.
3.  **Objetivo de la pantalla:** qué necesita entender o hacer el
    usuario.
4.  **Tipo de superficie:** página pública, catálogo, dashboard,
    administración, formulario, flujo operativo, app móvil, contenido
    editorial u otra.
5.  **Contenido real disponible:** datos, servicios, productos, textos,
    fotos, marca y restricciones.
6.  **Restricciones técnicas:** framework, componentes existentes,
    responsive, accesibilidad, estados y arquitectura.
7.  **Referencias:** qué se quiere aprender de ellas y qué no se debe
    copiar.

Si falta información que pueda cambiar de forma material la dirección de
arte, preguntar antes de inventarla. Si el dato no es esencial, proponer
una suposición explícita y reversible.

------------------------------------------------------------------------

## 4. Investigación de referencias: estudiar, no copiar

Cuando el usuario pida un diseño nuevo o una mejora sustancial,
investigar referencias relevantes antes de generar la propuesta.

### Método de investigación

1.  Buscar por **tipo de interfaz y problema**, no solo por estética:
    por ejemplo, "service business homepage", "inventory management
    table", "repair order detail", "product catalog filters", "energy
    monitoring dashboard".
2.  Revisar ejemplos de varios sectores y estilos; no limitarse a
    páginas de IA/SaaS.
3.  Estudiar estructura, ritmo, jerarquía, navegación, densidad,
    contenido, tratamiento de imágenes, interacción y estados.
4.  Seleccionar entre 3 y 5 referencias complementarias.
5.  Para cada referencia, registrar:
    -   qué principio visual o de UX funciona;
    -   en qué contexto funciona;
    -   qué adaptar al proyecto;
    -   qué evitar copiar;
    -   URL y fecha de consulta cuando proceda.
6.  Sintetizar los principios aprendidos en una dirección original para
    el proyecto.
7.  No replicar de forma literal la identidad, composición distintiva,
    textos, ilustraciones ni activos de un sitio de referencia.

### No usar popularidad como sustituto del criterio

Un sitio premiado o muy compartido puede ser una mala referencia para el
problema actual. Evaluar la pertinencia y el contexto, no solo lo
llamativo.

### Bibliotecas de referencia sugeridas

-   **Awwwards** --- https://www.awwwards.com/\
    Exploración de dirección de arte, interacción, animación y sitios
    experimentales. Usar con criterio: no todas las tendencias sirven
    para interfaces operativas.
-   **Godly** --- https://godly.design/\
    Galería curada de sitios, portfolios, páginas de producto y
    dirección visual contemporánea.
-   **SiteInspire** --- https://www.siteinspire.com/\
    Referencias web filtrables por estilo, tipo, industria y
    composición; útil para estudiar estructuras distintas.
-   **Mobbin** --- https://mobbin.com/\
    Biblioteca de pantallas y flujos reales de aplicaciones móviles y
    web; especialmente útil para patrones de producto y recorridos de
    usuario.
-   **Refero** --- https://refero.design/\
    Investigación de pantallas, flujos, patrones UI y tipos de página,
    incluidos dashboards, formularios, catálogos y onboarding. Revisar
    las funciones y límites del plan disponible.
-   **Dribbble** --- https://dribbble.com/\
    Útil para explorar conceptos, tratamiento visual y detalles. No
    asumir que una imagen conceptual representa un producto completo,
    accesible o funcional.
-   **Behance** --- https://www.behance.net/\
    Útil para estudiar proyectos completos, identidad de marca, sistemas
    visuales y casos de estudio.
-   **Pinterest** --- https://www.pinterest.com/\
    Útil para moodboards amplios y asociaciones visuales; validar
    siempre el origen, el contexto y la calidad de las referencias.
-   **Are.na** --- https://www.are.na/\
    Útil para colecciones curatoriales, investigación visual y
    conexiones conceptuales menos dependientes de tendencias de UI.

La disponibilidad de contenido, las funciones de búsqueda y los planes
pueden cambiar. Preferir fuentes originales y comprobar las condiciones
vigentes.

------------------------------------------------------------------------

## 5. Anti-patrones: señales de diseño genérico

No son prohibiciones absolutas. Son señales para revisar la intención.

-   Hero centrado con titular enorme, subtítulo vago y dos botones por
    defecto.
-   Gradientes morados/azules o glow sin relación con la marca.
-   Glassmorphism, blur, sombras flotantes y grandes radios usados como
    decoración automática.
-   La misma cuadrícula de tres o cuatro tarjetas para servicios,
    ventajas, testimonios y métricas.
-   Iconos genéricos de librería sustituyendo fotografía, datos o
    elementos propios del dominio.
-   Eyebrows en mayúsculas, microetiquetas, numeración ornamental o
    tipografía mono decorativa sin función.
-   Testimonios, métricas, logos, premios, clientes o afirmaciones
    inventadas.
-   Imágenes de stock que no representan al negocio o al usuario.
-   Secciones que podrían intercambiarse entre dos empresas sin cambiar
    el sentido.
-   Componentes visualmente llamativos que no ayudan a entender, decidir
    o actuar.
-   Repetir una tendencia vista en redes sin explicar por qué encaja con
    el proyecto.
-   Copiar una referencia completa en vez de extraer sus principios.

### Regla de decisión

Antes de conservar un patrón, el agente debe poder explicar qué
propósito cumple. Si solo está ahí porque "se ve moderno", debe
reconsiderarse.

------------------------------------------------------------------------

## 6. Explorar direcciones de arte distintas

Para una pantalla nueva importante, presentar **tres direcciones
realmente diferentes** antes de escoger una.

No basta con cambiar la paleta. Variar al menos cuatro de estos ejes: -
composición y asimetría; - jerarquía tipográfica; - densidad y ritmo; -
relación entre texto, imagen y datos; - tratamiento fotográfico o
ilustrativo; - uso de espacio negativo; - navegación y agrupación del
contenido; - carácter de los contenedores; - interacción o elemento
distintivo.

Cada dirección debe incluir: 1. nombre y concepto; 2. razón por la que
encaja con el producto; 3. estructura y jerarquía; 4. referencias y
principios extraídos; 5. ventajas y trade-offs; 6. riesgos de usabilidad
o implementación.

El usuario elige o combina propuestas antes de crear la pantalla final.
Si el usuario ya aprobó una dirección, no volver a abrir la exploración
sin necesidad.

------------------------------------------------------------------------

## 7. Perfiles por tipo de interfaz

### A. Página pública / marketing

Priorizar identidad de marca, claridad de la propuesta de valor,
narrativa, contenido auténtico, jerarquía editorial y llamada a la
acción apropiada. La estructura debe responder al negocio, no seguir una
plantilla obligatoria de hero → stats → cards → testimonials → FAQ.

### B. Catálogo / comercio

Priorizar descubrimiento, fotografías consistentes, información de
producto, búsqueda, filtros, comparación, precio/stock cuando
corresponda y estados vacíos útiles. No convertir cada dato en una
tarjeta.

### C. Dashboard / administración

Priorizar tareas frecuentes, jerarquía de información, densidad
apropiada, tablas legibles, filtros, estados, feedback, permisos,
accesibilidad y manejo de errores. No convertir una aplicación operativa
en una landing de marketing ni añadir gráficos decorativos sin valor.

### D. Formularios y flujos operativos

Priorizar orden de tareas, etiquetas claras, validación junto al campo,
prevención de errores, guardado, estados de carga y confirmaciones
proporcionadas. Mostrar detalles progresivamente cuando la complejidad
lo justifique.

### E. Móvil

Priorizar el contexto de uso, objetivos táctiles, contenido esencial,
navegación comprensible y comportamiento real a diferentes anchos. No
reducir simplemente la versión desktop.

### F. Editorial, portfolio y contenido

Priorizar voz, tipografía, lectura, ritmo, imágenes y composición
narrativa. No imponer componentes de SaaS por defecto.

El agente debe elegir el perfil apropiado para cada superficie. Un mismo
producto puede tener varios perfiles y sistemas visuales compatibles,
pero no idénticos.

------------------------------------------------------------------------

## 8. Identidad específica por proyecto

Cada proyecto debe mantener su propio `DESIGN.md`, brief y activos. No
transferir automáticamente colores, tipografías, efectos, componentes o
referencias de un proyecto a otro.

Ejemplos: - **Computer & Electronic:** homepage pública de presentación
y redirección a WhatsApp; la plataforma interna gestiona equipos y
operaciones. Son superficies diferentes. - **SOLVIX:** proyecto de
energía solar con su propio dominio, lenguaje y objetivos. - **Joyería
El Tío:** marca y operaciones de joyería, con una identidad distinta.

Estos ejemplos son contexto, no instrucciones para imponer una estética
predefinida. La identidad de cada proyecto se debe confirmar y
documentar por separado.

------------------------------------------------------------------------

## 9. Flujo de Stitch → aprobación → Cursor → Playwright

### Fase 1: investigar

-   Leer esta constitución y el `DESIGN.md` del proyecto.
-   Inspeccionar pantallas y sistemas de diseño existentes.
-   Investigar referencias relevantes.
-   Identificar riesgos y lagunas.

### Fase 2: proponer

-   Presentar tres direcciones distintas para una pantalla importante.
-   Justificar decisiones.
-   No crear ni modificar pantallas en un proyecto existente hasta que
    el usuario apruebe el plan, salvo que haya pedido explícitamente
    generación directa.

### Fase 3: diseñar en Stitch

-   Transmitir al MCP el contexto global pertinente y el sistema del
    proyecto.
-   Mantener separados los sistemas de diseño de superficies distintas.
-   Generar o editar de forma incremental.
-   Mostrar al usuario las pantallas y el resultado; no declarar
    aprobación por él.

### Fase 4: documentar

-   Actualizar el `DESIGN.md` específico del proyecto.
-   Registrar tokens, tipografía, espaciado, componentes, responsive,
    estados y excepciones.
-   Mantener la constitución global independiente del sistema visual
    concreto.

### Fase 5: implementar en Cursor

-   Usar la skill adecuada al tipo de superficie.
-   Respetar arquitectura, framework, componentes y lógica existentes.
-   Reproducir la dirección aprobada; no reinterpretarla sin
    autorización.
-   No añadir dependencias o reescribir componentes por conveniencia
    estética.

### Fase 6: verificar con Playwright

-   Inspeccionar las rutas y resoluciones relevantes.
-   Probar navegación, formularios, botones y estados críticos.
-   Tomar capturas y compararlas con el diseño aprobado.
-   Distinguir regresiones reales de diferencias intencionales.
-   Corregir defectos y volver a validar.

------------------------------------------------------------------------

## 10. Criterios de aprobación

Antes de aprobar un boceto, evaluar de 1 a 5: - pertinencia para el
producto y la audiencia; - identidad y diferenciación; - calidad de
composición y jerarquía; - tipografía y legibilidad; - uso de imágenes y
activos auténticos; - coherencia de componentes; - claridad del
recorrido de usuario; - responsive; - accesibilidad; - viabilidad
técnica.

No aprobar únicamente porque la pantalla sea atractiva en una captura.
Debe tener sentido como interfaz completa.

### Pregunta de control anti-genérico

"Si quitáramos el nombre y el logo, ¿esta interfaz podría pertenecer a
cientos de productos sin cambiar nada?"

Si la respuesta es sí, identificar qué decisiones pueden anclarse mejor
al dominio, contenido, usuarios y personalidad del producto.

### Accesibilidad y calidad

-   Contraste legible y estados no comunicados solo mediante color.
-   Navegación por teclado y foco visible.
-   Etiquetas accesibles y estructura semántica.
-   Estados de carga, error, vacío, éxito y deshabilitado donde
    corresponda.
-   Respeto por `prefers-reduced-motion`.
-   Layout sin overflow y con adaptación responsive.
-   Animación solo si mejora comprensión, feedback o identidad.

------------------------------------------------------------------------

## 11. Cómo invocar estas reglas desde Cursor

Para tareas de diseño, el agente debe: 1. Leer esta constitución y el
`DESIGN.md` del proyecto. 2. Identificar el tipo de interfaz y
seleccionar la skill adecuada. 3. Si utiliza Stitch MCP, incluir en la
petición los principios globales relevantes; no asumir que Stitch puede
leer automáticamente las reglas de Cursor. 4. Para trabajo
significativo, proponer direcciones y solicitar aprobación antes de
modificar diseños existentes. 5. Al terminar, informar qué referencias
consultó, qué decisiones tomó, qué quedó pendiente y cómo se validó.

### Prompt breve reutilizable

> Lee `design-system/DESIGN_CONSTITUTION.md` y el `DESIGN.md` del
> proyecto antes de diseñar. Identifica el perfil de interfaz.
> Investiga referencias relevantes, extrae principios en lugar de
> copiar sitios y evita patrones genéricos sin justificación. Para una
> pantalla nueva importante, presenta tres direcciones de arte
> estructuralmente distintas y explica sus trade-offs. No modifiques el
> diseño ni el código hasta que apruebe una dirección. Si utilizas
> Stitch MCP, transmite explícitamente las reglas pertinentes. Después
> implementa respetando la arquitectura existente y valida el resultado
> con Playwright.

------------------------------------------------------------------------

## 12. Mantenimiento del sistema

-   Actualizar la constitución cuando el equipo aprenda una regla
    generalizable, no por cada preferencia puntual.
-   Mantener decisiones particulares en el `DESIGN.md` del proyecto.
-   Revisar referencias periódicamente y comprobar que siguen
    disponibles.
-   Registrar qué dirección fue aprobada y por qué.
-   No convertir una regla anti-patrón en una prohibición rígida sin
    contexto.
-   Priorizar la intención del usuario, la accesibilidad y los
    requisitos funcionales sobre tendencias.

**Resultado esperado:** un equipo que investiga, propone, diseña,
implementa y verifica con criterios compartidos; interfaces distintas
por proyecto y menos diseños intercambiables generados por defecto.
