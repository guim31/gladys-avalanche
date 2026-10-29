# Boletines de aludes (BERA)

El boletín de estimación del riesgo de aludes (BERA) de Météo-France en Gladys, para los 35 macizos franceses de los
Alpes, los Pirineos y Córcega: un dispositivo por macizo, con su nivel de riesgo de 1 a 5, la tendencia del día
siguiente, las orientaciones más expuestas y el espesor de nieve. Incluye disparadores de escena y un widget de panel.

> **Lea el boletín completo antes de salir.** Esta integración muestra un resumen. No sustituye ni el boletín, ni el
> texto del predictor, ni su propia evaluación sobre el terreno.

Sin afiliación con Météo-France.

## Lo que obtiene

- **Un dispositivo por macizo** elegido: Mont-Blanc, Belledonne, Aspe-Ossau, Cinto-Rotondo…
- El **nivel de riesgo** del día del boletín (escala europea, 1 Débil a 5 Muy fuerte) y la **tendencia** del día
  siguiente.
- El nivel **bajo y sobre la altitud límite**, y esa altitud (0 cuando el boletín da un solo nivel para todo el
  macizo).
- Las **orientaciones más expuestas**, la **fecha de emisión** y el **fin de validez**.
- El **espesor de nieve** en las caras norte y sur a la altitud más alta de la tabla del boletín (2000 m en los
  Prealpes, Córcega y el País Vasco, 2500 m en el resto).
- **Boletín vigente**: 1 mientras un boletín cubre la hora actual, 0 si no (fuera de temporada).
- Dos **disparadores de escena** y un **widget de panel**.

## Requisitos

- Gladys Assistant 5.3.0 o posterior.
- Acceso a Internet desde Gladys. Ni cuenta ni clave: los boletines proceden del archivo abierto de Météo-France en
  data.gouv.fr.
- Météo-France emite los boletines **de principios de noviembre a principios de junio**, por lo general hacia las
  16 h para el día siguiente. Fuera de temporada, los dispositivos indican «ningún boletín vigente», sin error.

## Configuración

### Ajustes

| Ajuste                                 | Por defecto | Función                                                                                |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| Macizos                                | ninguno     | Los macizos que se siguen, un dispositivo cada uno.                                    |
| Clave de API de Météo-France           | vacía       | Opcional: lee los boletines por la API DPBRA en lugar del archivo.                     |
| Idioma de los nombres de las funciones | francés     | Nombres de las funciones de los nuevos dispositivos, idioma de sus textos y variables. |

Guarde, abra la pestaña **Descubrir** de la integración y cree los dispositivos que desee.

### Opcional: la clave de API de Météo-France

El archivo abierto basta en condiciones normales. Si se retrasa (el boletín del día no aparece por la tarde), cree
una cuenta gratuita en el [portal de API de Météo-France](https://portail-api.meteofrance.fr), suscríbase a la API
«Bulletin d'estimation du risque d'avalanche» (DPBRA), genere una **clave de API** y péguela en la configuración. La
integración consulta entonces directamente a Météo-France, una petición por macizo cada 30 minutos. Esta vía se
desarrolló a partir de la documentación de la API, sin clave: sus comentarios son bienvenidos. El enlace al PDF del
boletín solo existe con el archivo.

## Dispositivos

| Función                             | Tipo        | Valor                                                                   |
| ----------------------------------- | ----------- | ----------------------------------------------------------------------- |
| Riesgo de aludes (1-5)              | número      | Nivel más alto del día del boletín                                      |
| Tendencia del riesgo, día siguiente | número      | Nivel previsto para el día siguiente                                    |
| Riesgo bajo la altitud límite       | número      | Nivel bajo la altitud límite (o todo el macizo)                         |
| Riesgo sobre la altitud límite      | número      | Nivel sobre la altitud límite (o todo el macizo)                        |
| Altitud límite                      | metros      | 0 sin altitud límite                                                    |
| Orientaciones más expuestas         | texto       | «N, NE, NO», «Todas las orientaciones» o «Ninguna orientación señalada» |
| Boletín emitido el                  | texto       | Fecha y hora de emisión                                                 |
| Válido hasta                        | texto       | Fin de validez (18 h del día siguiente)                                 |
| Nieve cara norte / sur              | centímetros | Espesor de nieve a 2000 o 2500 m según el macizo                        |
| Boletín vigente                     | sí / no     | 1 mientras el boletín es válido                                         |

Los niveles son números (no la insignia «riesgo» de Gladys, que solo conoce cuatro niveles): una condición de escena
como «riesgo ≥ 4» funciona. Sin boletín vigente, solo se actualiza «Boletín vigente»: los demás valores no se
inventan y simplemente envejecen.

## Widget de panel

**Riesgo de aludes**: sin macizo elegido, una línea por macizo seguido (10 como máximo) con su nivel escrito como el
pictograma oficial («4 · Fuerte») y la tendencia del día siguiente, en verde (1), amarillo (2) o rojo (3 y más). Con
un macizo elegido: las fichas del riesgo y del día siguiente, los niveles bajo y sobre la altitud límite, las
orientaciones, el espesor de nieve, la validez, el comentario del predictor y un botón hacia el PDF del boletín. El
comentario y el botón tienen cada uno un ajuste para ocultarlos.

## Disparadores de escena

- **El riesgo de aludes alcanza un nivel**: un nuevo boletín eleva el riesgo de un macizo al nivel elegido (2 a 5) o
  más. Se dispara una vez, cuando el nivel se supera al alza: de 2 a 4, «alcanza 3» y «alcanza 4» se disparan ambos.
  Variables: macizo, nivel, nombre del nivel, fin de validez.
- **Nuevo boletín de aludes**: Météo-France emite un nuevo boletín para un macizo. Variables: macizo, nivel, nombre
  del nivel, tendencia del día siguiente, fin de validez, resumen del boletín (en francés, tal como lo redacta
  Météo-France), enlace al PDF.

El primerísimo boletín leído tras la instalación solo fija la referencia: no dispara nada.

## Ejemplos de escenas

- A las 18 h, si el riesgo de su macizo es 4 o más, enviar un mensaje «Riesgo de aludes {{level}} mañana».
- Con cada nuevo boletín, enviar su resumen y el enlace al PDF al grupo familiar.

## Fuentes, licencia y cuotas

- Boletines © Météo-France, [archivo de los boletines de aludes](https://www.data.gouv.fr/datasets/archive-des-bulletins-avalanches)
  en data.gouv.fr, Licence Ouverte 2.0. Leído cada 30 minutos: un pequeño archivo de índice, y el boletín de un
  macizo solo cuando aparece uno nuevo.
- API DPBRA de Météo-France, opcional: una petición por macizo cada 30 minutos, muy por debajo de las 50 peticiones
  por minuto del portal.

## Solución de problemas

- **«Ningún boletín vigente»** en temporada, por la tarde: el archivo puede ir con retraso; espere al ciclo siguiente
  (30 minutos) o añada una clave de API (véase más arriba).
- **«Météo-France rechaza la clave de API»**: compruebe la clave en la configuración o déjela vacía para usar el
  archivo.
- El estado de conexión indica que los boletines no se pueden leer: data.gouv.fr o Météo-France no responde. Se
  conservan los últimos valores y la integración lo intenta de nuevo cada 30 minutos.

## Límites

- Desarrollada fuera de temporada: los boletines de la temporada 2025-2026 sirvieron para las pruebas, pero aún no
  se ha medido el retraso del archivo en plena temporada. Sus comentarios son bienvenidos.
- Solo un resumen del boletín: los textos sobre el manto de nieve, la meteorología y la calidad de la nieve siguen en
  el PDF.
- Andorra no está cubierta: Météo-France no publica boletín para ella.
