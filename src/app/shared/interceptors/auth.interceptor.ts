import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Obtenemos el token del localStorage
  const token = localStorage.getItem('access_token');

  // 2. Valida si el token existe, clonamos la petición y le añadimos la cabecera
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    // 3. Enviamos la petición clonada con el token
    return next(cloned);
  }
  // 4. Si no hay token, enviamos la petición original (el backend la rechazará con 401)
  return next(req);
};