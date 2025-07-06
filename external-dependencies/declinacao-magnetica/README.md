# como compilar
gfortran CARTA.f -o gerar -ldislin

# versão do gfortran usada com sucesso

```bash
root@c3c602fb9074:/app# gfortran --version
GNU Fortran (Debian 8.3.0-6) 8.3.0
Copyright (C) 2018 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

# como atualizar constantes
a funcao IGRFDZ no arquivo CARTA.f deve ser substituida pelo corpo da funcao de synthesis da versao atual do igrf
por exemplo, [na versao 14](https://www.ngdc.noaa.gov/IAGA/vmod/igrf14.f), a funcao é igrf14syn ; todo o conteudo a partir do comentario abaixo da definicao ```subroutine igrf14syn (isv,date,itype,alt,colat,elong,x,y,z,f)``` até o final da definicao da funcao e substituido pelo corpo de ```SUBROUTINE IGRFDZ(isv,date,itype,alt,colat,elong,x,y,z,f)```.

# dependencias
a única dependencia é o dislin. para não ter problemas através dos anos, foi adicionado o pacote exato da dependencia. existem outras que devem ser instaladas, como no exemplo abaixo para ubuntu/debian:

```bash
apt-get install libxm4 libmotif-common libjpeg62-turbo
```