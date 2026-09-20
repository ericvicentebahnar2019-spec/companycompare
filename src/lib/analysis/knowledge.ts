import type { Level } from "./types";

/**
 * Base de conocimiento del análisis.
 *
 * Cada regla asocia una brecha (la métrica en la que la empresa va por detrás)
 * con causas plausibles y con una acción concreta. Las reglas son
 * deterministas y auditables: el motor solo las activa cuando los datos las
 * sostienen, y siempre expone qué evidencia ha usado y qué falta por
 * comprobar. La capa de IA puede enriquecer estas hipótesis, nunca
 * sustituirlas sin dejar marcado que son inferencias.
 */

export interface SupportSignal {
  /** Métrica que, si también está por detrás, refuerza la hipótesis. */
  metricId: string;
  /** Cómo se lee esa evidencia en lenguaje de negocio. */
  reading: string;
}

export interface AbsoluteSignal {
  metricId: string;
  /** Umbral por debajo del cual el valor propio es en sí mismo una señal. */
  below: number;
  reading: string;
}

export interface RecommendationTemplate {
  title: string;
  summary: string;
  steps: string[];
  cost: Level;
  difficulty: Level;
  expectedEffect: string;
  kpis: string[];
}

export interface CauseRule {
  id: string;
  /** Métricas de hallazgo a las que se aplica la regla. */
  metrics: string[];
  statement: string;
  /** Explicación del mecanismo por el que esta causa produce la brecha. */
  mechanism: string;
  supports?: SupportSignal[];
  absoluteSignals?: AbsoluteSignal[];
  checks: string[];
  recommendation: RecommendationTemplate;
}

export const CAUSE_RULES: readonly CauseRule[] = [
  // ── Recompra y retención ───────────────────────────────────
  {
    id: "sin-fidelizacion",
    metrics: ["tasaRecompra", "retencion", "frecuenciaCompra", "valorAnualCliente"],
    statement: "Ausencia de un programa de fidelización.",
    mechanism:
      "Sin un incentivo explícito para volver, la segunda compra depende solo de que el cliente se acuerde por su cuenta.",
    absoluteSignals: [
      {
        metricId: "crm",
        below: 4,
        reading:
          "La madurez del CRM es baja, así que probablemente no hay forma de identificar ni premiar al cliente que repite.",
      },
      {
        metricId: "coberturaEmail",
        below: 40,
        reading:
          "Menos de la mitad de los clientes recibe comunicaciones, así que no hay canal para sostener un programa de puntos.",
      },
    ],
    supports: [
      {
        metricId: "coberturaEmail",
        reading: "El competidor llega por email a una parte mayor de su base de clientes.",
      },
    ],
    checks: [
      "¿Existe un programa de puntos o recompensas por compra repetida?",
      "¿Se envían ofertas personalizadas a quien ya ha comprado?",
      "¿Qué porcentaje de clientes recibe emails al menos una vez al mes?",
    ],
    recommendation: {
      title: "Crear un programa de fidelización",
      summary:
        "Dar al cliente una razón concreta para volver y medir si la segunda compra se acelera.",
      steps: [
        "Definir un sistema de puntos simple: un punto por cada euro gastado, canjeable a partir de un umbral alcanzable en dos compras.",
        "Crear una recompensa específica para la segunda compra (descuento, envío gratis o producto complementario).",
        "Automatizar un email 15 días después de la primera compra recordando el saldo de puntos.",
        "Añadir un incentivo por recomendar a un conocido, con recompensa para ambas partes.",
        "Medir la recompra del grupo inscrito frente al no inscrito durante al menos dos ciclos de compra.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Los programas de puntos actúan sobre la parte de la base que ya conoce el producto, que es la más barata de reactivar. El efecto depende de que la recompensa sea alcanzable y de que el recordatorio llegue; conviene validarlo con un grupo de control antes de extenderlo.",
      kpis: ["tasaRecompra", "valorAnualCliente", "ticketMedio", "numClientes"],
    },
  },
  {
    id: "postventa-debil",
    metrics: ["tasaRecompra", "retencion", "satisfaccion"],
    statement: "Experiencia postventa poco desarrollada.",
    mechanism:
      "Si el contacto se corta al entregar el pedido, cualquier incidencia se convierte en abandono silencioso.",
    supports: [
      {
        metricId: "satisfaccion",
        reading: "La satisfacción declarada es inferior a la del competidor.",
      },
      {
        metricId: "devoluciones",
        reading: "La tasa de devoluciones es más alta, señal de expectativas mal ajustadas.",
      },
      {
        metricId: "tiempoEntrega",
        reading: "El plazo de entrega es más largo que el del competidor.",
      },
    ],
    checks: [
      "¿Se contacta con el cliente después de la entrega para confirmar que todo ha ido bien?",
      "¿Se mide la satisfacción de forma sistemática y no solo cuando hay queja?",
      "¿Cuánto se tarda en resolver una incidencia de media?",
    ],
    recommendation: {
      title: "Montar un circuito de postventa medido",
      summary:
        "Convertir la entrega en el principio de la relación en vez de en el final.",
      steps: [
        "Enviar un mensaje de seguimiento entre 3 y 7 días después de la entrega con una única pregunta de satisfacción.",
        "Definir un compromiso de respuesta para incidencias y publicarlo.",
        "Registrar en el CRM el motivo de cada incidencia para localizar las causas repetidas.",
        "Revisar mensualmente los tres motivos más frecuentes y corregir el origen, no solo el caso.",
      ],
      cost: "low",
      difficulty: "low",
      expectedEffect:
        "Detectar antes las incidencias suele reducir el abandono de clientes que no se quejan pero no vuelven. La magnitud depende del peso que tengan hoy los problemas de entrega o calidad.",
      kpis: ["satisfaccion", "retencion", "devoluciones", "tasaRecompra"],
    },
  },
  {
    id: "poca-comunicacion",
    metrics: ["tasaRecompra", "retencion", "frecuenciaCompra", "coberturaEmail"],
    statement: "Frecuencia de comunicación con el cliente inferior a la del competidor.",
    mechanism:
      "La frecuencia de compra está acotada por la frecuencia con la que el cliente recuerda que existes.",
    supports: [
      {
        metricId: "coberturaEmail",
        reading: "El competidor alcanza por email a un porcentaje mayor de su base.",
      },
      {
        metricId: "canalesSociales",
        reading: "El competidor mantiene actividad en más canales.",
      },
    ],
    absoluteSignals: [
      {
        metricId: "coberturaEmail",
        below: 50,
        reading: "Más de la mitad de los clientes no recibe ninguna comunicación directa.",
      },
    ],
    checks: [
      "¿Con qué frecuencia recibe un cliente una comunicación útil, no comercial?",
      "¿Existe un calendario de contenidos o se publica de forma reactiva?",
      "¿Se segmenta la base o se envía lo mismo a todo el mundo?",
    ],
    recommendation: {
      title: "Establecer un ritmo de contacto sostenible",
      summary:
        "Un calendario fijo y segmentado, dimensionado para poder mantenerlo todo el año.",
      steps: [
        "Segmentar la base en tres grupos: compró una vez, compra recurrente, inactivo más de seis meses.",
        "Definir una cadencia realista por grupo y escribirla como compromiso (por ejemplo, dos envíos al mes).",
        "Preparar con antelación el contenido de un trimestre para no depender de la disponibilidad semanal.",
        "Medir apertura y compra atribuida por segmento, y recortar lo que no mueva ninguna de las dos.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Aumentar el número de contactos útiles suele elevar la frecuencia de compra del segmento ya activo. El riesgo es la saturación, así que conviene subir la cadencia por pasos vigilando las bajas.",
      kpis: ["coberturaEmail", "frecuenciaCompra", "tasaRecompra", "valorAnualCliente"],
    },
  },

  // ── Ticket medio y valor por cliente ───────────────────────
  {
    id: "sin-venta-cruzada",
    metrics: ["ticketMedio", "valorAnualCliente"],
    statement: "No se trabaja la venta cruzada ni el incremento de cesta.",
    mechanism:
      "Sin recomendación en el momento de la compra, el cliente se lleva exactamente lo que vino a buscar.",
    supports: [
      {
        metricId: "numProductos",
        reading: "El catálogo del competidor es más amplio, lo que le da más opciones de combinación.",
      },
      {
        metricId: "precioMedio",
        reading: "El precio medio del competidor es superior, lo que apunta a una cesta o una gama distinta.",
      },
    ],
    checks: [
      "¿Se recomiendan productos complementarios durante el proceso de compra?",
      "¿Existen packs o umbrales de envío gratis que empujen a subir la cesta?",
      "¿Cuál es la distribución del ticket, no solo la media?",
    ],
    recommendation: {
      title: "Aumentar el valor de cada pedido",
      summary:
        "Actuar sobre la cesta en el momento de la compra, donde la intención ya existe.",
      steps: [
        "Identificar los tres pares de productos que más se compran juntos con los datos de pedidos.",
        "Ofrecer el complemento dentro del proceso de compra, no después.",
        "Fijar un umbral de envío gratis ligeramente por encima del ticket medio actual.",
        "Crear un pack con descuento inferior al margen para no erosionar la rentabilidad.",
        "Comparar ticket medio y margen antes y después: subir el ticket a costa del margen no es ganar.",
      ],
      cost: "low",
      difficulty: "low",
      expectedEffect:
        "La recomendación en el punto de compra actúa sobre clientes con intención ya confirmada, por lo que suele ser de las palancas más rápidas. Debe vigilarse el margen para que el incremento de cesta no se coma la mejora.",
      kpis: ["ticketMedio", "margen", "valorAnualCliente"],
    },
  },

  // ── Facturación ────────────────────────────────────────────
  // La facturación no tiene causa propia: es el producto de tres factores.
  // Estas dos reglas dirigen la atención al factor que más se separa en lugar
  // de repetir que se factura menos.
  {
    id: "facturacion-base-clientes",
    metrics: ["facturacion", "beneficio"],
    statement: "La base de clientes es más pequeña y eso marca el techo de la facturación.",
    mechanism:
      "La facturación es el producto de cuántos clientes hay, cuánto gasta cada uno y con qué frecuencia. Si el número de clientes está por detrás, el resto tiene que compensarlo entero.",
    supports: [
      {
        metricId: "numClientes",
        reading: "El competidor atiende a más clientes.",
      },
      {
        metricId: "traficoWeb",
        reading: "Entra menos tráfico, que es de donde salen los clientes nuevos.",
      },
      {
        metricId: "conversion",
        reading: "De cada visita se convierte a menos clientes.",
      },
    ],
    checks: [
      "¿Cuántos clientes nuevos han entrado este año y de qué canal?",
      "¿Cuántos clientes se han perdido en el mismo periodo?",
      "¿Hay capacidad para atender más clientes sin cambiar la estructura?",
    ],
    recommendation: {
      title: "Trabajar el crecimiento de la base de clientes",
      summary:
        "Antes de invertir en captación, saber cuántos clientes se pierden por el camino.",
      steps: [
        "Calcular la entrada y la salida de clientes de los últimos doce meses por separado.",
        "Si la salida pesa más que la entrada, trabajar primero la retención: es más barato que captar.",
        "Si la entrada es el problema, comparar coste por cliente de cada canal y reforzar el más rentable.",
        "Fijar un objetivo mensual de clientes nuevos y revisarlo con el dato real, no con la impresión.",
      ],
      cost: "medium",
      difficulty: "medium",
      expectedEffect:
        "Separar entrada y salida evita el error habitual de invertir en captación cuando el agujero está en la retención. El recorrido depende de cuál de las dos esté peor.",
      kpis: ["numClientes", "cac", "retencion", "facturacion"],
    },
  },
  {
    id: "facturacion-valor-cliente",
    metrics: ["facturacion", "beneficio"],
    statement: "Cada cliente deja menos dinero al año que en el competidor.",
    mechanism:
      "Con la misma base de clientes, el ticket medio y la frecuencia de compra deciden la facturación. Subir cualquiera de los dos no requiere captar a nadie nuevo.",
    supports: [
      { metricId: "ticketMedio", reading: "El ticket medio del competidor es mayor." },
      {
        metricId: "frecuenciaCompra",
        reading: "Sus clientes compran más veces al año.",
      },
      {
        metricId: "valorAnualCliente",
        reading: "El valor anual de cada cliente es inferior.",
      },
      {
        metricId: "tasaRecompra",
        reading: "Una parte menor de los clientes llega a la segunda compra.",
      },
    ],
    checks: [
      "¿Qué porcentaje de la facturación viene de clientes que repiten?",
      "¿Cuál es la distribución del ticket, no solo la media?",
      "¿Hay productos de gama alta que no se estén ofreciendo?",
    ],
    recommendation: {
      title: "Subir el valor anual de cada cliente",
      summary:
        "Actuar sobre ticket y frecuencia, que no dependen de conseguir clientes nuevos.",
      steps: [
        "Descomponer la facturación en clientes × ticket × frecuencia y ver cuál de los tres se separa más del competidor.",
        "Atacar ese factor primero con una sola acción, para poder atribuir el efecto.",
        "Medir el valor anual por cliente antes y después del cambio.",
        "Vigilar el margen: subir el ticket a costa de descuentos no mejora el resultado.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Trabajar sobre clientes que ya compran suele dar resultado antes que la captación, porque no hay que pagar la adquisición. El límite lo pone lo que el cliente esté dispuesto a gastar.",
      kpis: ["ticketMedio", "frecuenciaCompra", "valorAnualCliente", "margen"],
    },
  },

  // ── Adquisición y conversión ───────────────────────────────
  {
    id: "conversion-web-baja",
    metrics: ["conversion", "ingresoPorVisita", "numClientes"],
    statement: "El embudo de compra pierde visitas en algún paso concreto.",
    mechanism:
      "Con el mismo tráfico, cada punto de conversión se traduce directamente en clientes: es la palanca más barata porque el visitante ya está pagado.",
    supports: [
      {
        metricId: "analytics",
        reading: "La madurez de analítica es menor, así que cuesta saber dónde se cae el visitante.",
      },
      {
        metricId: "seo",
        reading: "La visibilidad orgánica es menor, lo que suele traer tráfico menos cualificado.",
      },
    ],
    absoluteSignals: [
      {
        metricId: "analytics",
        below: 5,
        reading:
          "Sin analítica del embudo no hay forma de saber en qué paso se pierde la venta.",
      },
    ],
    checks: [
      "¿Está medido el embudo paso a paso: visita, ficha, carrito, pago?",
      "¿Qué porcentaje del tráfico llega desde móvil y cómo convierte frente a escritorio?",
      "¿Cuántos pasos y cuántos campos tiene el proceso de pago?",
    ],
    recommendation: {
      title: "Instrumentar y corregir el embudo de conversión",
      summary:
        "Antes de traer más visitas, dejar de perder las que ya llegan.",
      steps: [
        "Configurar la medición de cada paso del embudo y dejarla funcionando dos semanas para tener base.",
        "Localizar el paso con mayor caída y atacar solo ese.",
        "Reducir el proceso de pago a los campos imprescindibles y permitir compra sin registro.",
        "Revisar la experiencia en móvil con un dispositivo real, no solo redimensionando el navegador.",
        "Probar un cambio cada vez y dejar correr el tiempo suficiente para no leer ruido.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Mejorar la conversión multiplica el efecto de todo el tráfico existente, así que su impacto en facturación suele ser superior al de subir la inversión publicitaria. El recorrido depende de lo lejos que esté el embudo actual de lo razonable en el sector.",
      kpis: ["conversion", "ingresoPorVisita", "numClientes", "cac"],
    },
  },
  {
    id: "trafico-insuficiente",
    metrics: ["traficoWeb", "numClientes"],
    statement: "El esfuerzo de captación, orgánico y de pago, es menor que el del competidor.",
    mechanism:
      "El número de clientes está acotado por el volumen de visitas cualificadas multiplicado por la conversión.",
    supports: [
      { metricId: "seo", reading: "La visibilidad orgánica del competidor es mayor." },
      {
        metricId: "inversionPublicidad",
        reading: "El competidor invierte más en publicidad de pago.",
      },
      {
        metricId: "seguidores",
        reading: "El competidor tiene una audiencia propia más amplia.",
      },
    ],
    checks: [
      "¿Qué proporción del tráfico es orgánica y cuál de pago?",
      "¿Qué pasaría con las ventas si mañana se apagara la publicidad?",
      "¿Qué búsquedas del sector se están perdiendo frente al competidor?",
    ],
    recommendation: {
      title: "Construir una base de tráfico que no dependa del pago",
      summary:
        "Combinar contenido orgánico para el medio plazo con pago acotado para el corto.",
      steps: [
        "Listar las 20 búsquedas con intención de compra del sector y ver en cuáles no se aparece.",
        "Publicar contenido para las cinco de mayor intención y menor competencia.",
        "Corregir los problemas técnicos que bloqueen la indexación antes de producir más contenido.",
        "Mantener la publicidad limitada a las campañas cuyo coste por cliente esté por debajo del valor anual del cliente.",
      ],
      cost: "medium",
      difficulty: "high",
      expectedEffect:
        "El tráfico orgánico tarda meses en madurar pero no desaparece al dejar de pagar. Conviene no reducir la inversión de pago hasta que el orgánico sostenga el volumen.",
      kpis: ["traficoWeb", "seo", "cac", "numClientes"],
    },
  },
  {
    id: "cac-alto",
    metrics: ["cac", "ratioValorCac"],
    statement: "La captación depende de canales de pago con poco rendimiento.",
    mechanism:
      "Un coste de adquisición alto consume el margen de las primeras compras y obliga a retener para ser rentable.",
    supports: [
      {
        metricId: "conversion",
        reading: "La conversión es menor, así que cada visita pagada rinde menos.",
      },
      {
        metricId: "tasaRecompra",
        reading: "La recompra es menor, así que el coste no se amortiza en compras posteriores.",
      },
      {
        metricId: "seo",
        reading: "Con menos tráfico orgánico, una parte mayor de la captación se paga.",
      },
    ],
    checks: [
      "¿El CAC incluye solo el gasto en medios o también el coste del equipo?",
      "¿Cuál es el CAC por canal y no solo el agregado?",
      "¿Cuántas compras hacen falta para recuperar el coste de adquisición?",
    ],
    recommendation: {
      title: "Reducir el coste de adquisición por canal",
      summary:
        "Separar el CAC por canal y cortar lo que no se paga con el valor del cliente.",
      steps: [
        "Calcular el CAC de cada canal por separado, incluyendo el coste de las personas dedicadas.",
        "Compararlo con el valor anual del cliente: mantener lo que esté por debajo, revisar lo que esté por encima.",
        "Redirigir el presupuesto de los canales peores a los que ya demuestran rentabilidad.",
        "Activar recomendación de clientes, que suele tener el coste de adquisición más bajo.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Reasignar presupuesto entre canales ya medidos suele bajar el coste medio sin reducir volumen. El límite es la capacidad del canal rentable de absorber más inversión sin encarecerse.",
      kpis: ["cac", "ratioValorCac", "conversion", "numClientes"],
    },
  },

  // ── Margen y costes ────────────────────────────────────────
  {
    id: "margen-estructura-costes",
    metrics: ["margen", "beneficio", "flujoCaja"],
    statement: "La estructura de costes absorbe más margen que la del competidor.",
    mechanism:
      "Con precios parecidos, la diferencia de margen viene del coste de producir, servir y entregar.",
    supports: [
      {
        metricId: "costeProduccion",
        reading: "El coste unitario de producción es superior al del competidor.",
      },
      {
        metricId: "costeLogistico",
        reading: "La logística pesa más sobre la facturación que en el competidor.",
      },
      {
        metricId: "facturacionPorEmpleado",
        reading: "Cada empleado genera menos facturación que en el competidor.",
      },
      {
        metricId: "devoluciones",
        reading: "Las devoluciones son más altas y cada una consume margen ya generado.",
      },
    ],
    checks: [
      "¿Cuál es el margen por línea de producto y no solo el agregado?",
      "¿Cuánto pesan los costes fijos sobre el total?",
      "¿Cuándo se revisaron por última vez las condiciones con proveedores?",
    ],
    recommendation: {
      title: "Recuperar margen por línea de producto",
      summary:
        "Localizar dónde se pierde el margen antes de tocar el precio de forma general.",
      steps: [
        "Calcular el margen real por línea de producto, imputando logística y devoluciones.",
        "Identificar las líneas por debajo del margen objetivo y decidir: subir precio, renegociar coste o retirar.",
        "Renegociar con los dos proveedores de mayor volumen usando el dato de compra anual.",
        "Revisar el efecto sobre volumen a los dos meses antes de extender la subida al resto del catálogo.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Actuar sobre las líneas concretas que están por debajo del objetivo evita el riesgo de una subida general de precios. El efecto en beneficio es directo, pero puede costar volumen en las líneas más sensibles al precio.",
      kpis: ["margen", "beneficio", "costeProduccion", "ticketMedio"],
    },
  },
  {
    id: "coste-produccion-alto",
    metrics: ["costeProduccion"],
    statement: "El coste unitario está dominado por el material o por procesos que se rehacen.",
    mechanism:
      "Un coste unitario mayor obliga a vender más caro o a aceptar menos margen en cada venta.",
    supports: [
      {
        metricId: "rotacionInventario",
        reading: "La rotación de inventario es menor, señal de compras poco ajustadas a la demanda.",
      },
      {
        metricId: "automatizacion",
        reading: "El nivel de automatización es menor, así que hay más coste de mano de obra por unidad.",
      },
    ],
    checks: [
      "¿Qué parte del coste unitario es material y qué parte es proceso?",
      "¿Se compra con previsión de demanda o de forma reactiva?",
      "¿Hay pasos del proceso que se repiten o se rehacen?",
    ],
    recommendation: {
      title: "Atacar los dos componentes mayores del coste unitario",
      summary:
        "Descomponer el coste y trabajar solo sobre lo que pesa de verdad.",
      steps: [
        "Descomponer el coste unitario en material, proceso y logística.",
        "Renegociar el material del componente de mayor peso con volumen anual comprometido.",
        "Cronometrar el proceso para localizar los pasos que se rehacen y eliminar la causa del reproceso.",
        "Volver a medir el coste unitario un mes después del cambio.",
      ],
      cost: "medium",
      difficulty: "medium",
      expectedEffect:
        "Concentrarse en los dos componentes principales suele dar más resultado que recortes repartidos. El efecto sobre el margen es directo si no se traslada a precio.",
      kpis: ["costeProduccion", "margen", "rotacionInventario"],
    },
  },

  // ── Operaciones ────────────────────────────────────────────
  {
    id: "entrega-lenta",
    metrics: ["tiempoEntrega"],
    statement: "La preparación interna del pedido alarga el plazo total.",
    mechanism:
      "El plazo de entrega influye en la decisión de compra y en la probabilidad de que el cliente repita.",
    supports: [
      {
        metricId: "rotacionInventario",
        reading: "La rotación es menor, lo que suele indicar stock mal ajustado a lo que se vende.",
      },
      {
        metricId: "costeLogistico",
        reading: "El coste logístico es mayor, señal de una operativa menos eficiente.",
      },
    ],
    checks: [
      "¿Cuánto tiempo pasa entre el pedido y la salida del almacén?",
      "¿Qué proporción de los retrasos es por falta de stock?",
      "¿El operador logístico cumple el plazo que promete?",
    ],
    recommendation: {
      title: "Reducir el plazo en el tramo interno",
      summary:
        "Separar el tiempo propio del tiempo del transportista y atacar primero el propio.",
      steps: [
        "Medir por separado preparación interna y tránsito del transportista.",
        "Fijar una hora de corte diaria para que los pedidos del día salgan el mismo día.",
        "Mantener stock de seguridad solo de las referencias que concentran la mayoría de los pedidos.",
        "Comunicar al cliente un plazo realista: cumplir lo prometido pesa más que prometer poco tiempo.",
      ],
      cost: "medium",
      difficulty: "medium",
      expectedEffect:
        "Acortar la preparación interna es lo que está bajo control directo y suele explicar buena parte del retraso. La mejora en satisfacción depende de que el plazo prometido se cumpla de forma consistente.",
      kpis: ["tiempoEntrega", "satisfaccion", "tasaRecompra"],
    },
  },
  {
    id: "devoluciones-altas",
    metrics: ["devoluciones"],
    statement: "Lo que el cliente espera no coincide con lo que recibe.",
    mechanism:
      "Cada devolución consume el margen de la venta y deja al cliente con una experiencia negativa.",
    supports: [
      {
        metricId: "calidadPercibida",
        reading: "La calidad percibida es inferior a la del competidor.",
      },
      {
        metricId: "satisfaccion",
        reading: "La satisfacción general es menor.",
      },
    ],
    checks: [
      "¿Cuáles son los tres motivos de devolución más frecuentes?",
      "¿La información del producto describe medidas, materiales y uso con precisión?",
      "¿Se concentran las devoluciones en unas pocas referencias?",
    ],
    recommendation: {
      title: "Reducir la devolución evitable",
      summary:
        "Distinguir la devolución por expectativa mal ajustada de la devolución por defecto real.",
      steps: [
        "Clasificar las devoluciones del último trimestre por motivo.",
        "Corregir la ficha de las referencias que concentren más devoluciones por expectativa.",
        "Añadir fotos o vídeo de uso real en esas referencias.",
        "Si el motivo es defecto, tratarlo como incidencia de calidad con el proveedor, no como coste logístico.",
      ],
      cost: "low",
      difficulty: "low",
      expectedEffect:
        "La devolución por expectativa mal ajustada se corrige con información y suele bajar rápido. La devolución por defecto exige actuar sobre el producto y tarda más.",
      kpis: ["devoluciones", "margen", "satisfaccion", "calidadPercibida"],
    },
  },

  // ── Producto ───────────────────────────────────────────────
  {
    id: "diferenciacion-debil",
    metrics: ["diferenciacion", "precioMedio", "calidadPercibida"],
    statement: "La propuesta de valor no está comunicada con claridad.",
    mechanism:
      "Sin diferencia percibida, la decisión de compra se traslada al precio y el margen se comprime.",
    supports: [
      {
        metricId: "frecuenciaLanzamiento",
        reading: "El competidor lanza novedades con más frecuencia.",
      },
      {
        metricId: "calidadPercibida",
        reading: "La calidad percibida del competidor es superior.",
      },
    ],
    checks: [
      "¿Qué dice un cliente que le llevó a elegirnos frente a la alternativa?",
      "¿Hay algo que solo nosotros hagamos y esté comunicado en la web?",
      "¿Se compite principalmente por precio en la práctica?",
    ],
    recommendation: {
      title: "Hacer explícita la diferencia",
      summary:
        "Identificar la ventaja real y llevarla al primer plano del mensaje.",
      steps: [
        "Entrevistar a diez clientes recurrentes y preguntar qué les hizo quedarse.",
        "Quedarse con el motivo que más se repita y que el competidor no pueda decir.",
        "Llevar ese mensaje a la página de inicio, la ficha de producto y el proceso de compra.",
        "Medir si cambia la conversión y si permite sostener precio sin perder volumen.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Una diferencia comunicada con claridad reduce la sensibilidad al precio del tramo de clientes que la valora. No crea diferencia donde no la hay: si de las entrevistas no sale nada sólido, el trabajo es de producto, no de mensaje.",
      kpis: ["diferenciacion", "conversion", "margen", "precioMedio"],
    },
  },
  {
    id: "innovacion-lenta",
    metrics: ["frecuenciaLanzamiento", "numProductos", "crecimientoAnual"],
    statement: "No hay calendario de lanzamientos: se lanza cuando surge.",
    mechanism:
      "Las novedades dan motivo para volver y ocupan espacio de comunicación durante todo el año.",
    supports: [
      {
        metricId: "numProductos",
        reading: "El catálogo del competidor es más amplio.",
      },
    ],
    checks: [
      "¿Cuánto tarda una idea en llegar al catálogo?",
      "¿Qué peso tienen en la facturación los productos lanzados en los últimos doce meses?",
      "¿Hay un calendario de lanzamientos o se lanza cuando surge?",
    ],
    recommendation: {
      title: "Fijar un calendario de lanzamientos sostenible",
      summary:
        "Menos novedades pero previsibles rinde más que muchas descoordinadas.",
      steps: [
        "Fijar un número de lanzamientos al año que el equipo pueda sostener.",
        "Reservar la fecha con antelación y preparar la comunicación antes del lanzamiento.",
        "Validar cada novedad con un grupo reducido de clientes antes de producir a escala.",
        "Medir el peso en facturación de los lanzamientos del año para decidir si el ritmo compensa.",
      ],
      cost: "medium",
      difficulty: "medium",
      expectedEffect:
        "Un calendario previsible permite preparar la captación alrededor del lanzamiento. El efecto depende de que las novedades respondan a demanda real y no solo a llenar el calendario.",
      kpis: ["frecuenciaLanzamiento", "crecimientoAnual", "tasaRecompra"],
    },
  },

  // ── Digital y organización ─────────────────────────────────
  {
    id: "analitica-insuficiente",
    metrics: ["analytics", "conversion", "crm"],
    statement: "No hay cuadro de mando ni atribución de canal por cliente.",
    mechanism:
      "Sin medición fiable, cada decisión se toma por intuición y no se puede saber si una acción ha funcionado.",
    absoluteSignals: [
      {
        metricId: "analytics",
        below: 5,
        reading: "La analítica está por debajo del nivel mínimo para decidir con datos.",
      },
      {
        metricId: "crm",
        below: 4,
        reading: "Sin CRM maduro no hay historial de cliente sobre el que actuar.",
      },
    ],
    checks: [
      "¿Se puede saber hoy de qué canal vino cada cliente?",
      "¿Hay un cuadro de mando que alguien mire de forma periódica?",
      "¿Coinciden las cifras de las distintas herramientas?",
    ],
    recommendation: {
      title: "Montar la medición mínima para decidir",
      summary:
        "Pocas métricas, bien definidas y revisadas con una periodicidad fija.",
      steps: [
        "Elegir entre seis y ocho métricas que describan el negocio y escribir cómo se calcula cada una.",
        "Configurar la atribución de canal para cada cliente nuevo.",
        "Montar un cuadro de mando único y revisarlo el mismo día cada semana.",
        "Cuadrar las cifras entre herramientas antes de usarlas para decidir.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "La medición no mejora el resultado por sí sola, pero es la condición para saber qué acciones funcionan. Su valor se ve en las decisiones de los meses siguientes.",
      kpis: ["analytics", "crm", "conversion", "cac"],
    },
  },
  {
    id: "automatizacion-baja",
    metrics: ["automatizacion", "facturacionPorEmpleado", "usoIA"],
    statement: "El trabajo repetitivo se sigue haciendo a mano.",
    mechanism:
      "El trabajo repetitivo manual limita cuánto puede crecer el negocio sin crecer la plantilla.",
    supports: [
      {
        metricId: "facturacionPorEmpleado",
        reading: "Cada empleado genera menos facturación que en el competidor.",
      },
      {
        metricId: "crm",
        reading: "La madurez del CRM es menor, así que el seguimiento comercial es manual.",
      },
    ],
    checks: [
      "¿Qué tres tareas repetitivas consumen más horas a la semana?",
      "¿Cuántas de esas horas son de personas cualificadas haciendo trabajo mecánico?",
      "¿Qué se rompería si mañana se duplicaran los pedidos?",
    ],
    recommendation: {
      title: "Automatizar las tres tareas de mayor coste horario",
      summary:
        "Empezar por lo repetitivo y bien definido, que es donde la automatización falla menos.",
      steps: [
        "Registrar durante una semana el tiempo dedicado a tareas repetitivas.",
        "Ordenarlas por horas mensuales y elegir las tres primeras.",
        "Automatizar primero la más repetitiva y con reglas más claras.",
        "Medir las horas liberadas y reinvertirlas en trabajo comercial antes de seguir con la siguiente.",
      ],
      cost: "medium",
      difficulty: "medium",
      expectedEffect:
        "Liberar horas solo mejora el resultado si esas horas se reinvierten en actividad que genera ingreso. Conviene decidir de antemano en qué se van a emplear.",
      kpis: ["automatizacion", "facturacionPorEmpleado", "margen"],
    },
  },
  {
    id: "productividad-baja",
    metrics: ["facturacionPorEmpleado"],
    statement: "La estructura pesa más en soporte que en generación de ingreso.",
    mechanism:
      "La facturación por empleado resume cuánto rinde la estructura: si es baja, o falta volumen o sobra proceso manual.",
    supports: [
      {
        metricId: "automatizacion",
        reading: "El nivel de automatización es menor.",
      },
      {
        metricId: "facturacion",
        reading: "La facturación total también está por detrás, así que el problema puede ser de volumen y no solo de estructura.",
      },
    ],
    checks: [
      "¿Cómo se reparte la plantilla entre funciones que generan ingreso y funciones de soporte?",
      "¿Hay procesos que requieran varias personas para una sola tarea?",
      "¿La estructura está dimensionada para la facturación actual o para la esperada?",
    ],
    recommendation: {
      title: "Revisar el reparto de la estructura",
      summary:
        "Ver cuánta capacidad está puesta en generar ingreso antes de plantear cambios de plantilla.",
      steps: [
        "Clasificar cada función entre generación de ingreso, entrega y soporte.",
        "Calcular qué porcentaje de las horas totales va a cada bloque.",
        "Localizar los procesos de soporte que consumen más horas y simplificarlos.",
        "Revisar el indicador cada trimestre en lugar de reaccionar a un solo dato.",
      ],
      cost: "low",
      difficulty: "high",
      expectedEffect:
        "Este indicador se mueve despacio y depende tanto de la facturación como de la plantilla. Conviene tratarlo como indicador de control, no como objetivo directo.",
      kpis: ["facturacionPorEmpleado", "margen", "automatizacion"],
    },
  },
  {
    id: "seo-debil",
    metrics: ["seo"],
    statement: "No se trabaja contenido para las búsquedas con intención de compra.",
    mechanism:
      "El tráfico orgánico no se paga por clic, así que la diferencia en visibilidad se traduce en diferencia de coste de adquisición.",
    supports: [
      { metricId: "traficoWeb", reading: "El competidor recibe más visitas." },
      { metricId: "cac", reading: "El coste de adquisición propio es mayor." },
    ],
    checks: [
      "¿Qué búsquedas del sector traen tráfico al competidor y no a nosotros?",
      "¿Hay problemas técnicos que impidan indexar parte de la web?",
      "¿Con qué frecuencia se publica contenido nuevo?",
    ],
    recommendation: {
      title: "Cerrar el hueco de visibilidad orgánica",
      summary:
        "Priorizar por intención de compra, no por volumen de búsquedas.",
      steps: [
        "Listar las búsquedas con intención de compra en las que aparece el competidor y nosotros no.",
        "Resolver primero los bloqueos técnicos de indexación.",
        "Publicar contenido para las cinco búsquedas de mayor intención y menor competencia.",
        "Revisar posiciones cada mes y reescribir lo que se quede entre los puestos 5 y 15.",
      ],
      cost: "medium",
      difficulty: "high",
      expectedEffect:
        "El posicionamiento orgánico tarda entre tres y seis meses en reflejar el trabajo. A cambio, el tráfico que genera no desaparece al dejar de invertir.",
      kpis: ["seo", "traficoWeb", "cac", "conversion"],
    },
  },
  {
    id: "satisfaccion-baja",
    metrics: ["satisfaccion", "calidadPercibida"],
    statement: "La entrega y la postventa arrastran la valoración del cliente.",
    mechanism:
      "La satisfacción anticipa la retención: el cliente insatisfecho rara vez avisa, simplemente no vuelve.",
    supports: [
      { metricId: "tiempoEntrega", reading: "El plazo de entrega es más largo." },
      { metricId: "devoluciones", reading: "Las devoluciones son más frecuentes." },
      { metricId: "retencion", reading: "La retención también está por detrás." },
    ],
    checks: [
      "¿Se mide la satisfacción de forma sistemática o solo cuando hay queja?",
      "¿Cuáles son los tres motivos de queja más repetidos?",
      "¿Se cierra el circuito avisando al cliente de qué se ha corregido?",
    ],
    recommendation: {
      title: "Medir y cerrar el circuito de satisfacción",
      summary:
        "Preguntar de forma sistemática y actuar sobre los motivos repetidos.",
      steps: [
        "Enviar una pregunta única de satisfacción después de cada entrega.",
        "Agrupar las respuestas por motivo y ordenarlas por frecuencia.",
        "Corregir el motivo más repetido y comunicar el cambio a quien lo señaló.",
        "Revisar la evolución mensual en lugar de reaccionar a valoraciones sueltas.",
      ],
      cost: "low",
      difficulty: "low",
      expectedEffect:
        "Responder a quien se queja recupera parte de esos clientes y reduce el boca a boca negativo. La mejora del indicador depende de corregir la causa, no solo de preguntar.",
      kpis: ["satisfaccion", "retencion", "devoluciones", "tasaRecompra"],
    },
  },
  {
    id: "crecimiento-inferior",
    metrics: ["crecimientoAnual"],
    statement: "El crecimiento depende solo de clientes nuevos y no de la base existente.",
    mechanism:
      "Una diferencia sostenida de crecimiento amplía la distancia cada año aunque hoy el tamaño sea parecido.",
    supports: [
      { metricId: "numClientes", reading: "La base de clientes crece por detrás." },
      { metricId: "traficoWeb", reading: "La captación de tráfico es menor." },
      { metricId: "tasaRecompra", reading: "La recompra aporta menos crecimiento propio." },
    ],
    checks: [
      "¿Qué parte del crecimiento viene de clientes nuevos y qué parte de los existentes?",
      "¿El crecimiento se ha frenado en un momento concreto o ha sido gradual?",
      "¿Hay un límite de capacidad que impida crecer aunque haya demanda?",
    ],
    recommendation: {
      title: "Separar las dos fuentes de crecimiento",
      summary:
        "Saber si falta captación o falta desarrollo de la base antes de decidir dónde invertir.",
      steps: [
        "Descomponer la facturación del año en clientes nuevos y clientes existentes.",
        "Comparar la evolución de ambas partes respecto al año anterior.",
        "Concentrar el esfuerzo del trimestre en la que esté más floja.",
        "Revisar el reparto cada trimestre para no arrastrar la decisión todo el año.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Distinguir el origen del crecimiento evita invertir en captación cuando el problema es de retención, que suele ser el error más caro.",
      kpis: ["crecimientoAnual", "numClientes", "tasaRecompra", "facturacion"],
    },
  },
  {
    id: "rotacion-baja",
    metrics: ["rotacionInventario"],
    statement: "Las compras no están ajustadas a la demanda real.",
    mechanism:
      "Cada vuelta de inventario libera caja: rotar menos significa tener el dinero parado en stock.",
    supports: [
      { metricId: "flujoCaja", reading: "El flujo de caja también está por detrás." },
      { metricId: "tiempoEntrega", reading: "El plazo de entrega es mayor pese a mantener stock." },
    ],
    checks: [
      "¿Qué porcentaje del stock lleva más de seis meses sin venderse?",
      "¿Se compra según previsión de demanda o por lotes de proveedor?",
      "¿Cuánta caja hay inmovilizada en inventario ahora mismo?",
    ],
    recommendation: {
      title: "Liberar la caja inmovilizada en stock",
      summary:
        "Sacar el stock parado y ajustar la compra a lo que realmente se vende.",
      steps: [
        "Clasificar las referencias por ventas de los últimos doce meses.",
        "Liquidar de forma controlada las que no se han movido en seis meses.",
        "Ajustar el punto de pedido de las referencias de mayor rotación.",
        "Vigilar que la reducción de stock no alargue el plazo de entrega.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "Liberar caja inmovilizada mejora la tesorería sin necesidad de financiación. El riesgo es quedarse corto de stock en las referencias que más se venden.",
      kpis: ["rotacionInventario", "flujoCaja", "tiempoEntrega"],
    },
  },
  {
    id: "coste-logistico-alto",
    metrics: ["costeLogistico"],
    statement: "El coste de envío pesa demasiado sobre un ticket medio bajo.",
    mechanism:
      "El coste logístico se come el margen de cada pedido y limita el margen de maniobra en precio.",
    supports: [
      { metricId: "ticketMedio", reading: "El ticket medio es menor, así que el envío pesa más sobre cada pedido." },
      { metricId: "devoluciones", reading: "Las devoluciones son más frecuentes y duplican el coste de envío." },
    ],
    checks: [
      "¿Cuál es el coste de envío por pedido y cómo varía con el ticket?",
      "¿Cuándo se renegociaron por última vez las tarifas con el transportista?",
      "¿Qué porcentaje del coste logístico corresponde a devoluciones?",
    ],
    recommendation: {
      title: "Ajustar el coste logístico por pedido",
      summary:
        "Trabajar a la vez sobre la tarifa y sobre el tamaño medio del pedido.",
      steps: [
        "Calcular el coste logístico por pedido y su peso sobre el ticket medio.",
        "Renegociar tarifas con el volumen anual real como argumento y pedir oferta a un segundo operador.",
        "Fijar el umbral de envío gratis por encima del punto en que el pedido cubre su coste.",
        "Reducir la devolución evitable, que duplica el coste de envío de cada pedido afectado.",
      ],
      cost: "low",
      difficulty: "medium",
      expectedEffect:
        "La renegociación da resultado rápido si hay volumen que respalde la petición. Subir el ticket medio reduce el peso relativo del envío sin tocar la tarifa.",
      kpis: ["costeLogistico", "margen", "ticketMedio", "devoluciones"],
    },
  },
] as const;

/**
 * Regla de último recurso: garantiza que toda brecha detectada produzca al
 * menos una hipótesis y una acción, aunque sea para reconocer que hacen falta
 * más datos.
 */
export const FALLBACK_RULE: Omit<CauseRule, "metrics"> = {
  id: "generica",
  statement: "La causa concreta no se puede determinar con los datos disponibles.",
  mechanism:
    "La diferencia está medida, pero ninguna otra métrica del análisis apunta a un origen claro.",
  checks: [
    "¿Cómo se calcula exactamente este dato en cada una de las dos empresas?",
    "¿La diferencia viene de un cambio reciente o lleva tiempo así?",
    "¿Hay alguna circunstancia del negocio que explique la diferencia sin que sea un problema?",
  ],
  recommendation: {
    title: "Acotar el origen de la diferencia",
    summary:
      "Antes de actuar, confirmar que la diferencia es real y no un efecto de cómo se mide.",
    steps: [
      "Verificar que ambas cifras se calculan con el mismo criterio y el mismo periodo.",
      "Descomponer la métrica en sus factores para ver cuál se separa más.",
      "Recoger el dato de los últimos tres periodos para distinguir tendencia de dato puntual.",
      "Volver a ejecutar el análisis con los datos que falten.",
    ],
    cost: "low",
    difficulty: "low",
    expectedEffect:
      "Acotar el origen evita invertir esfuerzo en corregir una diferencia que puede ser un efecto de medición.",
    kpis: [],
  },
};
