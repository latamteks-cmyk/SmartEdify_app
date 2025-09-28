# Guía para Actualizar el Repositorio en GitHub

Esta guía define el flujo recomendado para trabajar y subir cambios en el repositorio SmartEdify_app siguiendo buenas prácticas de colaboración y control de versiones.

---

## 1. Creación de ramas feature
- **Por cada nuevo servicio o módulo, crea una rama feature dedicada:**
  - Ejemplo: `git checkout -b feature/nombre-servicio`
- **Al iniciar el desarrollo de un servicio:**
  - Crea la rama antes de cualquier cambio.
- **Al finalizar el desarrollo de un servicio:**
  - Haz commit de los cambios y sube la rama al remoto.

## 2. Flujo de trabajo recomendado
1. **Actualizar la rama main:**
   ```
   git checkout main
   git pull origin main
   ```
2. **Crear una nueva rama feature:**
   ```
   git checkout -b feature/nombre-servicio
   ```
3. **Desarrollar y hacer commits frecuentes:**
   ```
   git add .
   git commit -m "Descripción del avance"
   ```
4. **Subir la rama feature al remoto:**
   ```
   git push -u origin feature/nombre-servicio
   ```
5. **Abrir un Pull Request (PR) en GitHub:**
   - Solicita revisión y merge a main.

## 3. Buenas prácticas
- **Una rama por servicio o funcionalidad.**
- **Commits descriptivos y frecuentes.**
- **PRs con revisión obligatoria.**
- **No trabajar directamente en main.**
- **Actualizar main antes de crear una nueva rama.**
- **Eliminar ramas feature tras el merge.**

## 4. Ejemplo de ciclo completo
1. Iniciar desarrollo de `gateway-service`:
   ```
   git checkout main
   git pull origin main
   git checkout -b feature/gateway-service
   # Desarrollar...
   git add .
   git commit -m "Inicio gateway-service"
   git push -u origin feature/gateway-service
   # Abrir PR en GitHub
   ```
2. Finalizar y mergear:
   - Esperar revisión y merge.
   - Eliminar rama local y remota si es necesario.

---

**Utiliza este archivo como referencia cada vez que vayas a subir cambios o iniciar/finalizar el desarrollo de un servicio.**
