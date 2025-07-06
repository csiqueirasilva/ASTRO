      PARAMETER (NX =151, NY = 121)
      DIMENSION XRAY(300),YRAY(300),ZMAT(NX,NY),VMAT(NX,NY)
      DOUBLE PRECISION ANO
      CHARACTER*4 CDEV
      CHARACTER*30 CTIT
      CHARACTER*22 CFONT
      CHARACTER*32 CMDARG
      DATA CFONT/'TIMES NEW ROMAN ITALIC'/
      DATA ALOMIN,ALOMAX,ALAMIN,ALAMAX/-80.,-30.,-35.,6./
      DATA XMIN,XMAX,YMIN,YMAX/-80.,-30.,-35.,6./

      STEPX = 5.
      STEPY = 5.
      IDA = 1
      MOD = 2

      IF(iargc().eq.2) THEN

        CALL getarg(1, CMDARG)

        READ (CMDARG,*) ANO

        CALL getarg(2, CMDARG)

        IF(CMDARG.eq.'1') THEN
          ICO = 1
        ELSE IF (CMDARG.eq.'2') THEN
          ICO = 2
        ELSE
          ICO = 3
        ENDIF

      ELSE

        write(*,*)'           '
        write(*,*)'           '
        write(*,*)'         ANO DA CARTA  1915 a 2030 '
        write(*,*)'           '
        write(*,*)'           '
        write(*,*)'           '
        READ (5,*)  ANO

        ICO = 1

      ENDIF

      IPR = 1
      IBR = 1
      IST = 1
      ITI = 1

      CDEV = 'PDF'
      CALL METAFL(CDEV)
      CALL TESTE(ZMAT,VMAT,ANO,ICO,NX,NY,XRAY,YRAY,XMIN,XMAX,YMIN,YMAX)
      ELEM =  100000.
      ELEX = -100000.
      VDMN =  100000.
      VDMX = -100000.

      DO L = 1, NX
      DO J = 1, NY
      IF(ZMAT(L,J). LT. ELEM) ELEM = ZMAT(L,J)
      IF(ZMAT(L,J). GT. ELEX) ELEX = ZMAT(L,J)
      IF(VMAT(L,J). LT. VDMN) VDMN = VMAT(L,J)
      IF(VMAT(L,J). GT. VDMX) VDMX = VMAT(L,J)
      END DO
      END DO
C
      CALL SCALEC(ELEM,ELEX,ZMIN,ZMAX,ICO)
      CALL SCALEV(VDMN,VDMX,VMIN,VMAX,ICO)
C
      CALL SETPAG('DA4L')
      CALL SCRMOD('REVERS')
      CALL HWPAGE(2790,4200)
C
C ***** ******************************************
C
      CALL DISINI
C*************************************************
      CALL NOCHEK
      CALL MAPPOL(-55.,-5.)
      CALL PROJCT('LAMB')
      CALL CLPMOD('RECT')
      CALL INTAX
      CALL SETGRF('NAME','NAME','NONE','NONE')
      CALL HEIGHT(15)
      CALL GRAFMP(ALOMIN,ALOMAX,ALOMIN,STEPX,ALAMIN,ALAMAX,ALAMIN,STEPY)
C
c***********************
C
      CALL HEIGHT(40)
      CALL HWFONT
      CALL CHACOD('ISO1')

      IF(ICO.EQ.1) THEN
        WRITE(CTIT,'(A,F6.1)') 'DECLINACAO MAGNETICA ', ANO
      ELSE IF(ICO.EQ.2) THEN
        WRITE(CTIT,'(A,F6.1)') 'INCLINACAO MAGNETICA ', ANO
      ELSE
        WRITE(CTIT,'(A,F6.1)') 'COMPONENTE TOTAL ', ANO
      END IF

      CALL TITLIN('                   ',1)
      CALL TITLIN('                   ',2)
      CALL TITLIN('                   ',3)
      CALL TITLIN(CTIT,4)
      CALL TITLE
C
      CALL COLOR('BACK')
c
C*****Altura dos numeros no contorno Normal = 10
      CALL HEIGHT(12)  !  14-8-2008 de 20 para 10
      CALL PENWID(.2)        ! ORIGINAL 0.2   ACIMA HEIGHT = 12
C
C*****************************************************
      CALL COLOR('BLUE')
      CALL CONTOV(XRAY,NX,YRAY,NY,VMAT,ICO,VMAX,VMIN)
C*****************************************************
C
      CALL COLOR('RED')
      CALL CONTOR(XRAY,NX,YRAY,NY,ZMAT,ICO,ZMAX,ZMIN)
C*****************************************************
C
      CALL PENWID(.1)
      CALL COLOR('FORE')
      CALL COLOR('WHITE')
C
C*****GRADE DA PROJECAO********************
C
      call penwid(.05)
      CALL TICS(XMIN,XMAX,YMIN,YMAX)
      CALL GRIDMP(1,1)
      call penwid(.5)
      CALL COLOR('WHITE')
      call thkcrv(1)
      CALL PENWID(.5)
      CALL BRASEST
      call reset('thkcrv')
      call penwid(.5)
      CALL EST_RED
      CALL CAP_RED
      CALL OBS_RED
      CALL COLOR('FORE')
      CALL PENWID(.25)
C************************************************
      CALL DISFIN
C***********************************************
      STOP
      END
C
C*********************************************************************
C
      SUBROUTINE BRASEST
      DIMENSION XLON(20000),XLAT(20000)
      CHARACTER*1 AUX
      DATA AUX /'f'/
      OPEN(5,FILE='/opt/declinacao-magnetica/BRASIL.DAT')
      N = 1
   10 CONTINUE
      READ(5,11,END=25) XLON(N), XLAT(N), AUX
   11 FORMAT(2F12.6,1X,A1)
      N = N + 1
      IF(AUX.EQ.'f')  GO TO 15
      GO TO 10
   15 N = N - 1
      CALL CURVMP(XLON,XLAT,N)
      N = 1
      GO TO 10
   25 CONTINUE
      RETURN
      END
C
C**********************************************************************
C
      SUBROUTINE WORLDX
      DIMENSION XLON(50000),XLAT(50000)
      CHARACTER*1 AUX
      DATA AUX /'f'/
      OPEN(5,FILE='/opt/declinacao-magnetica/ALL_PAIS.DAT')
      N = 1
   10 CONTINUE
      READ(5,11,END=25) XLON(N), XLAT(N), AUX
   11 FORMAT(2F12.6,1X,A1)
      N = N + 1
      IF(AUX.EQ.'f')  GO TO 15
      GO TO 10
   15 N = N - 1
      CALL CURVMP(XLON,XLAT,N)
      N = 1
      GO TO 10
   25 CONTINUE
      RETURN
      END
C
C******************************************************************
C
      SUBROUTINE TICS(XMI,XMX,YMI,YMX)
C
      IF(YMX.EQ.6.) YMX = 5.
      IX = XMX - XMI + 1
      IY = YMX - YMI
      DO 40 K = 1, IX, 5
      ALON = XMI  + FLOAT(K - 1)
      X1 = ALON -.15
      X2 = ALON +.15
      DO 30 L = 1, IY
      ALAT = YMX  - FLOAT(L - 1)
      IF (L.EQ.1.OR.L.EQ.6.OR.L.EQ.11.OR.L.EQ.16.OR.L.EQ.21.OR.L.EQ.26.
     1OR.L.EQ.31.OR.L.EQ.36.OR.L.EQ.41.OR.L.EQ.46.OR.L.EQ.51) GO TO 30
      CALL POS2PT(X1,ALAT,XP,YP)
      CALL POS2PT(X2,ALAT,UP,VP)
      CALL XMOVE(XP,YP)
      CALL XDRAW(UP,VP)
30    CONTINUE
40    CONTINUE
C
      DO 60 K = 1, IY, 5
      ALAT =  YMX - FLOAT(K - 1)
      Y1 = ALAT -.1
      Y2 = ALAT +.1
      DO 50 L = 1, IX
      ALON =  XMI + FLOAT(L - 1)
      IF (L.EQ.1.OR.L.EQ.6.OR.L.EQ.11.OR.L.EQ.16.OR.L.EQ.21.OR.L.EQ.26.
     1OR.L.EQ.31.OR.L.EQ.36.OR.L.EQ.41.OR.L.EQ.46.OR.L.EQ.51) GO TO 50
      CALL POS2PT(ALON,Y1,XP,YP)
      CALL POS2PT(ALON,Y2,UP,VP)
      CALL XMOVE(XP,YP)
      CALL XDRAW(UP,VP)
50    CONTINUE
60    CONTINUE
      RETURN
      END
C
C*********************************************************************
C
      SUBROUTINE EST_RED
      DIMENSION XC(200),YC(200),ANG(200),NX(200),NY(200),IND(200)
      DIMENSION MX(200), MY(200)
      CHARACTER EST(200)*17,BLAN*2
      N = 1
      OPEN(5,FILE='EST_RED')
5     READ(5,10,END=15) IND(N),EST(N),YC(N),XC(N),ANG(N),NX(N),NY(N),
     1                  MX(N),MY(N)
10    FORMAT(I3,A17,7X,2F8.3,F8.1,2I4,2I5)
      N = N + 1
      GO TO  5
15    N = N - 1
      CLOSE(UNIT=5)
      CALL HEIGHT(6)
        CALL HSYMBL(2)
      DO I = 1, N
        CALL POS2PT(XC(I),YC(I),XP,YP)
        NXS = XP
        NYS = YP
        NXP = XP + NX(I)
        NYP = YP + NY(I)
        IF(IND(I).EQ.IND(I-1)) GO TO 20
        CALL SYMBOL(19,NXS,NYS)
20      CONTINUE
        NAG = ANG(I)
        CALL ANGLE(NAG)
        CALL MESSAG(EST(I),NXP,NYP)
      END DO
      RETURN
      END
C
C********************************************
C
      SUBROUTINE CAP_RED
      DIMENSION XC(30),YC(30),ANG(30),NX(30),NY(30),IND(30)
      CHARACTER EST(30)*17,BLAN*2
      N = 1
      OPEN(5,FILE='CAP_RED')
5     READ(5,10,END=15) IND(N),EST(N),YC(N),XC(N),ANG(N),NX(N),NY(N)
10    FORMAT(I3,A17,7X,2F8.3,F8.1,2I6)
      IF(NX(N).EQ.0) NX(N) = 5
      IF(NY(N).EQ.0) NY(N) = 5
      N = N + 1
      GO TO  5
15    N = N - 1
      CLOSE(UNIT=5)
      CALL HWFONT
      CALL HEIGHT(6)
       CALL HSYMBL(2)
      DO I = 1, N
        CALL POS2PT(XC(I),YC(I),XP,YP)
        NXS = XP
        NYS = YP
        NXP = XP + NX(I)
        NYP = YP + NY(I)
        IF(IND(I).EQ.IND(I-1)) GO TO 20
        CALL COLOR('RED')
        CALL SYMBOL(16,NXS,NYS)
        CALL RESET('COLOR')
20      CONTINUE
        NAG = ANG(I)
        CALL ANGLE(NAG)
        CALL MESSAG(EST(I),NXP,NYP)
      END DO
C***************************************************
      DO I = 1, N
        CALL HEIGHT(4)
        IF(IND(I).EQ.4) CALL MESSAG('~',1863,682)
        IF(IND(I).EQ.9) CALL MESSAG('~',2110,862)
        IF(IND(I).EQ.23) CALL MESSAG('~',1693,1402)
        IF(IND(I).EQ.18) CALL MESSAG('^',1697,1176)
        CALL HEIGHT(6)
        CALL ANGLE(45)
        IF(IND(I).EQ.2) CALL MESSAG('-',1606,591)
        IF(IND(I).EQ.3) CALL MESSAG('-',1733,648)
        IF(IND(I).EQ.4) CALL MESSAG('-',1890,683)
        IF(IND(I).EQ.12) CALL MESSAG('-',2122,955)
        IF(IND(I).EQ.14) CALL MESSAG('-',2123,1003)
        IF(IND(I).EQ.16) CALL MESSAG('-',1686,1126)
        IF(IND(I).EQ.20) CALL MESSAG('-',1977,1317)
        IF(IND(I).EQ.25) CALL MESSAG('-',1727,1554)
        IF(IND(I).EQ.17) CALL MESSAG('-',1436,1125)
        CALL RESET('ANGLE')
        CALL RESET('HEIGHT')
      END DO
      RETURN
      END
C
C*********************************************************************
C
      SUBROUTINE OBS_RED
      DIMENSION XC(30),YC(30),ANG(30),NX(30),NY(30),IND(30)
      CHARACTER EST(30)*17,BLAN*2
      N = 1
      OPEN(5,FILE='OBS_RED')
5     READ(5,10,END=15) IND(N),EST(N),YC(N),XC(N),ANG(N),NX(N),NY(N)
10    FORMAT(I3,A17,7X,2F8.3,F8.1,2I6)
      IF(NX(N).EQ.0) NX(N) = 5
      IF(NY(N).EQ.0) NY(N) = 5
      N = N + 1
      GO TO  5
15    N = N - 1
      CLOSE(UNIT=5)
      CALL COLOR('BLUE')
      CALL HWFONT
      CALL HEIGHT(6)
      CALL HSYMBL(4)
      DO I = 1, N
        CALL POS2PT(XC(I),YC(I),XP,YP)
        NXS = XP
        NYS = YP
        NXP = XP + NX(I)
        NYP = YP + NY(I)
        IF(IND(I).EQ.IND(I-1)) GO TO 20
        CALL SYMBOL(16,NXS,NYS)
20      CONTINUE
        NAG = ANG(I)
        CALL ANGLE(NAG)
        CALL MESSAG(EST(I),NXP,NYP)
      END DO
      RETURN
      END
C
C****************************************************************
C
      SUBROUTINE CONTOR(XRAY,NX,YRAY,NY,ZMAT,ICOMP,EMAX,EMIN)
      DIMENSION  ZMAT(NX,NY),XRAY(NX),YRAY(NY)
      REAL * 4 XLEV
      EXTERNAL DIGITS

      IF(ICOMP.EQ.1) THEN
        DIV = 1.
      ELSE IF(ICOMP.EQ.2) THEN
        DIV = 2.
      ELSE
        DIV = 350.
      END IF

      IDEL = (EMAX - EMIN + 1.) / DIV
      IF(IDEL.LT.5)  IDEL = (EMAX - EMIN + 1.) / DIV
      IF(IDEL.LE.1)  IDEL = (EMAX - EMIN + 1.) /  .2
      IF(IDEL.LE.1)  DIV  = .2
      IMIN = EMIN
      CALL DIGITS(-1,'CONTOUR')
      DO J = 1, IDEL
      XLEV = FLOAT(IMIN) + FLOAT(J - 1) * DIV
      CALL LABELS('FLOAT','CONTUR')
      CALL LABDIS(250,'CONTUR')
      CALL CONTUR(XRAY,NX,YRAY,NY,ZMAT,XLEV)
      END DO
      RETURN
      END
C
C***************************************************************
C
      SUBROUTINE CONTOV(XRAY,NX,YRAY,NY,ZMAT,ICOMP,EMAX,EMIN)
      DIMENSION  ZMAT(NX,NY),XRAY(NX),YRAY(NY)
      REAL * 4 XLEV
      EXTERNAL DIGITS

      IF(ICOMP.EQ.1) THEN
        DIV = .5
      ELSE IF(ICOMP.EQ.2) THEN
        DIV = 1.
      ELSE
        DIV = 10.
      END IF

      IDEL = 1 + (EMAX - EMIN ) / DIV
      IF(IDEL.LT.5)  IDEL = (EMAX - EMIN) / .5
      IF(IDEL.LE.1)  IDEL = (EMAX - EMIN) / .1
      IF(IDEL.LE.1)  DIV  = .1
      IMIN = EMIN
      CALL DIGITS(1,'CONTOUR')
      DO J = 1, IDEL
      XLEV = FLOAT(IMIN) + FLOAT(J - 1) * DIV
      CALL LABELS('FLOAT','CONTUR')
      CALL LABDIS(1010,'CONTUR')
      CALL CONTUR(XRAY,NX,YRAY,NY,ZMAT,XLEV)
      END DO
      RETURN
      END
C
C*************************************************************
C
      SUBROUTINE SCALEC (XMIN,XMAX,ZMIN,ZMAX,ICO)
C
      ZMIN = XMIN
      ZMAX = XMAX
      IF(ICO.EQ.1) GO TO 100
      IF(ICO.EQ.2) GO TO 200
      IF(ICO.EQ.3) GO TO  50
50    CONTINUE
      IM  = XMIN / 1000.
      AUX = XMIN / 1000. - FLOAT(IM)
      IF(AUX.LT..5) IAU =   0
      IF(AUX.GT..5) IAU = 500
      ZMIN = FLOAT(IM * 1000 + IAU)
      IN  = XMAX / 1000.
      AUY = XMAX / 1000. - FLOAT(IN)
      IF(AUY.LT.0.5) JAU =   0
      IF(AUY.GT.0.5) JAU = 500
      ZMAX = FLOAT(IN * 1000 + JAU)
      GO TO 300
100   CONTINUE
      ID  = ABS(XMIN)
      AUX = ABS(XMIN) - ID
      IF(AUX.LT..5)  AD =   0
      IF(AUX.GT..5)  AD =   1
      IF(XMIN.LT.0.) AD = -AD
      IF(XMIN.GT.0.) AD =   0
      ID = XMIN
      ZMIN = FLOAT(ID) + AD
      GO TO 300
200   CONTINUE
      II  = XMIN
      IJ  = ABS(XMIN) / 10.
      AUY = ABS(XMIN) / 10. - FLOAT(IJ)
      IC  = AUY * 10.
      IF(IC.EQ.1.OR.IC.EQ.3.OR.IC.EQ.5.OR.IC.EQ.7.OR.IC.EQ.9) AD = 1
      ZMIN = FLOAT(II) - AD
300   CONTINUE
      RETURN
      END

c
c**********************************************************
c
      SUBROUTINE SCALEV (XMIN,XMAX,ZMIN,ZMAX,ICO)
C
      ZMIN = XMIN
      ZMAX = XMAX
      IF(ICO.EQ.1) GO TO 100
      IF(ICO.EQ.2) GO TO 200
      IF(ICO.EQ.3) GO TO  50
50    CONTINUE
      IM  = ABS(XMIN) / 10.
      AUX = ABS(XMIN) / 10. - FLOAT(IM)
      IF(AUX.LT.0.5) IAU =   0
      IF(AUX.GT.0.5) IAU =   5
      ZMIN = FLOAT(IM * 10 + IAU)
      IF(XMIN.LT.0.0) ZMIN = -ZMIN
      IN  = XMAX / 10.
      AUY = XMAX / 10. - FLOAT(IN)
      IF(AUY.LT.0.5) JAU =   0
      IF(AUY.GT.0.5) JAU =   5
      ZMAX = FLOAT(IN  + JAU)
      IF(ZMAX.LT.0.0) ZMAX = -ZMAX
      GO TO 300
100   CONTINUE
      ID  = ABS(XMIN)
      AUX = ABS(XMIN) - ID
      IF(AUX.LT..5)  AD =   0
      IF(AUX.GT..5)  AD =   1
      IF(XMIN.LT.0.) AD = -AD
      IF(XMIN.GT.0.) AD =   0
      ID = XMIN
      ZMIN = FLOAT(ID) + AD
      GO TO 300
200   CONTINUE
      II  = XMIN
      IJ  = ABS(XMIN) / 10.
      AUY = ABS(XMIN) / 10. - FLOAT(IJ)
      IC  = AUY * 10.
      IF(IC.EQ.1.OR.IC.EQ.3.OR.IC.EQ.5.OR.IC.EQ.7.OR.IC.EQ.9) AD = 1
      ZMIN = FLOAT(II) + AD
300   CONTINUE
      RETURN
      END
C
C*********************************************************************
C
      SUBROUTINE TESTE(TMAT,WMAT,EPOCA,ICO,NX,NY,XLON,YLAT,XI,XA,YI,YA)
C
      DOUBLE PRECISION X,Y,Z,F,D,F1
      DOUBLE PRECISION XLN,CLT,ALT,H,VH,VX,VF,VZ,VD,VI,VY
      DOUBLE PRECISION COLAT,ELONG,EPOC,S,EPOCA
      DOUBLE PRECISION ATAN2,SQRT,FACT,DX,DY
      DIMENSION TMAT(NX,NY),WMAT(NX,NY),XLON(NX),YLAT(NY)
      EPOC = EPOCA
      PI = 3.1415926535
      FACT = 180.0/PI
      ALT = 0.D0
      DX = (XA-XI) / DFLOAT(NX)
      DY = (YA-YI) / DFLOAT(NY)
C
      DO 30 ILAT = 1, NY
      CLT = YA - (ILAT - 1) * DY
      YLAT(ILAT) = CLT
      CLT = 90.0D0 - CLT
      DO 20 ILON = 1, NX
      XLN = XI + (ILON - 1) * DX
      XLON(ILON) = XLN
      XLN = XLN + 360.0D0

      CALL IGRFDZ (0,EPOC, 1,ALT,CLT,XLN, X, Y, Z, F)
      CALL IGRFDZ (1,EPOC, 1,ALT,CLT,XLN,VX,VY,VZ,F1)
      D = FACT*ATAN2(Y,X)
      H = SQRT(X*X+Y*Y)
      S = FACT*ATAN2(Z,H)
      DD = (60.*FACT*(X*VY-Y*VX))/(H*H)
      DH = (X*VX+Y*VY)/H
      DS = (60.*FACT*(H*VZ-Z*DH))/(F*F)
      DF = (H*DH+Z*VZ)/F
C      WRITE(25,25) YLAT(ILAT),XLON(ILON),EPOC,D,DD,S,DS,F,DF
C25    FORMAT(9F10.1)
C
C
       IF (ICO.EQ.1) TMAT(ILON,ILAT) = D
       IF (ICO.EQ.2) TMAT(ILON,ILAT) = S
       IF (ICO.EQ.3) TMAT(ILON,ILAT) = F

C
       IF (ICO.EQ.1) WMAT(ILON,ILAT) = DD
       IF (ICO.EQ.2) WMAT(ILON,ILAT) = DS
       IF (ICO.EQ.3) WMAT(ILON,ILAT) = DF
C
C
20     CONTINUE
30     CONTINUE
       RETURN
       END
C
C*******************************************************************
C
      SUBROUTINE IGRFDZ(isv,date,itype,alt,colat,elong,x,y,z,f)
c
c     This is a synthesis routine for the 14th generation IGRF as agreed 
c     in December 2024 by IAGA Working Group V-MOD. It is valid 1900.0 to
c     2030.0 inclusive. Values for dates from 1945.0 to 2020.0 inclusive are 
c     definitive, otherwise they are non-definitive.
c   INPUT
c     isv   = 0 if main-field values are required
c     isv   = 1 if secular variation values are required
c     date  = year A.D. Must be greater than or equal to 1900.0 and 
c             less than or equal to 2035.0. Warning message is given 
c             for dates greater than 2030.0. Must be double precision.
c     itype = 1 if geodetic (spheroid)
c     itype = 2 if geocentric (sphere)
c     alt   = height in km above sea level if itype = 1
c           = distance from centre of Earth in km if itype = 2 (>3485 km)
c     colat = colatitude (0-180)
c     elong = east-longitude (0-360)
c     alt, colat and elong must be double precision.
c   OUTPUT
c     x     = north component (nT) if isv = 0, nT/year if isv = 1
c     y     = east component (nT) if isv = 0, nT/year if isv = 1
c     z     = vertical component (nT) if isv = 0, nT/year if isv = 1
c     f     = total intensity (nT) if isv = 0, rubbish if isv = 1
c
c     To get the other geomagnetic elements (D, I, H and secular
c     variations dD, dH, dI and dF) use routines ptoc and ptocsv.
c
c     Adapted from 8th generation version to include new maximum degree for
c     main-field models for 2000.0 and onwards and use WGS84 spheroid instead
c     of International Astronomical Union 1966 spheroid as recommended by IAGA
c     in July 2003. Reference radius remains as 6371.2 km - it is NOT the mean
c     radius (= 6371.0 km) but 6371.2 km is what is used in determining the
c     coefficients. Adaptation by Susan Macmillan, August 2003 (for 
c     9th generation), December 2004, December 2009 & December 2014;
c     by William Brown, December 2019, February 2020. Updated by 
c     Ciaran Beggan, November 2024
c
c     Coefficients at 1995.0 incorrectly rounded (rounded up instead of
c     to even) included as these are the coefficients published in Excel 
c     spreadsheet July 2005.
c
      implicit double precision (a-h,o-z)
      dimension gh(3840),g0(120),g1(120),g2(120),g3(120),g4(120),
     1          g5(120),g6(120),g7(120),g8(120),g9(120),ga(120),
     2          gb(120),gc(120),gd(120),ge(120),gf(120),gg(120),
     3          gi(120),gj(120),gk(195),gl(195),gm(195),gp(195),
     4          gq(195),gr(195),gs(195),gt(195),
     5          p(105),q(105),cl(13),sl(13)
      equivalence (g0,gh(1)),(g1,gh(121)),(g2,gh(241)),(g3,gh(361)),
     1            (g4,gh(481)),(g5,gh(601)),(g6,gh(721)),(g7,gh(841)),
     2            (g8,gh(961)),(g9,gh(1081)),(ga,gh(1201)),
     3            (gb,gh(1321)),(gc,gh(1441)),(gd,gh(1561)),
     4            (ge,gh(1681)),(gf,gh(1801)),(gg,gh(1921)),
     5            (gi,gh(2041)),(gj,gh(2161)),(gk,gh(2281)),
     6            (gl,gh(2476)),(gm,gh(2671)),(gp,gh(2866)),
     7            (gq,gh(3061)),(gr,gh(3256)),(gs,gh(3451)),
     8            (gt,gh(3646))
c
      data g0/ -31543.,-2298., 5922., -677., 2905.,-1061.,  924., 1121., 1900
     1           1022.,-1469., -330., 1256.,    3.,  572.,  523.,  876., 1900
     2            628.,  195.,  660.,  -69., -361., -210.,  134.,  -75., 1900
     3           -184.,  328., -210.,  264.,   53.,    5.,  -33.,  -86., 1900
     4           -124.,  -16.,    3.,   63.,   61.,   -9.,  -11.,   83., 1900
     5           -217.,    2.,  -58.,  -35.,   59.,   36.,  -90.,  -69., 1900
     6             70.,  -55.,  -45.,    0.,  -13.,   34.,  -10.,  -41., 1900
     7             -1.,  -21.,   28.,   18.,  -12.,    6.,  -22.,   11., 1900
     8              8.,    8.,   -4.,  -14.,   -9.,    7.,    1.,  -13., 1900
     9              2.,    5.,   -9.,   16.,    5.,   -5.,    8.,  -18., 1900
     a              8.,   10.,  -20.,    1.,   14.,  -11.,    5.,   12., 1900
     b             -3.,    1.,   -2.,   -2.,    8.,    2.,   10.,   -1., 1900
     c             -2.,   -1.,    2.,   -3.,   -4.,    2.,    2.,    1., 1900
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1900
     e              0.,   -2.,    2.,    4.,    2.,    0.,    0.,   -6./ 1900
      data g1/ -31464.,-2298., 5909., -728., 2928.,-1086., 1041., 1065., 1905
     1           1037.,-1494., -357., 1239.,   34.,  635.,  480.,  880., 1905
     2            643.,  203.,  653.,  -77., -380., -201.,  146.,  -65., 1905
     3           -192.,  328., -193.,  259.,   56.,   -1.,  -32.,  -93., 1905
     4           -125.,  -26.,   11.,   62.,   60.,   -7.,  -11.,   86., 1905
     5           -221.,    4.,  -57.,  -32.,   57.,   32.,  -92.,  -67., 1905
     6             70.,  -54.,  -46.,    0.,  -14.,   33.,  -11.,  -41., 1905
     7              0.,  -20.,   28.,   18.,  -12.,    6.,  -22.,   11., 1905
     8              8.,    8.,   -4.,  -15.,   -9.,    7.,    1.,  -13., 1905
     9              2.,    5.,   -8.,   16.,    5.,   -5.,    8.,  -18., 1905
     a              8.,   10.,  -20.,    1.,   14.,  -11.,    5.,   12., 1905
     b             -3.,    1.,   -2.,   -2.,    8.,    2.,   10.,    0., 1905
     c             -2.,   -1.,    2.,   -3.,   -4.,    2.,    2.,    1., 1905
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1905
     e              0.,   -2.,    2.,    4.,    2.,    0.,    0.,   -6./ 1905
      data g2/ -31354.,-2297., 5898., -769., 2948.,-1128., 1176., 1000., 1910
     1           1058.,-1524., -389., 1223.,   62.,  705.,  425.,  884., 1910
     2            660.,  211.,  644.,  -90., -400., -189.,  160.,  -55., 1910
     3           -201.,  327., -172.,  253.,   57.,   -9.,  -33., -102., 1910
     4           -126.,  -38.,   21.,   62.,   58.,   -5.,  -11.,   89., 1910
     5           -224.,    5.,  -54.,  -29.,   54.,   28.,  -95.,  -65., 1910
     6             71.,  -54.,  -47.,    1.,  -14.,   32.,  -12.,  -40., 1910
     7              1.,  -19.,   28.,   18.,  -13.,    6.,  -22.,   11., 1910
     8              8.,    8.,   -4.,  -15.,   -9.,    6.,    1.,  -13., 1910
     9              2.,    5.,   -8.,   16.,    5.,   -5.,    8.,  -18., 1910
     a              8.,   10.,  -20.,    1.,   14.,  -11.,    5.,   12., 1910
     b             -3.,    1.,   -2.,   -2.,    8.,    2.,   10.,    0., 1910
     c             -2.,   -1.,    2.,   -3.,   -4.,    2.,    2.,    1., 1910
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1910
     e              0.,   -2.,    2.,    4.,    2.,    0.,    0.,   -6./ 1910
      data g3/ -31212.,-2306., 5875., -802., 2956.,-1191., 1309.,  917., 1915
     1           1084.,-1559., -421., 1212.,   84.,  778.,  360.,  887., 1915
     2            678.,  218.,  631., -109., -416., -173.,  178.,  -51., 1915
     3           -211.,  327., -148.,  245.,   58.,  -16.,  -34., -111., 1915
     4           -126.,  -51.,   32.,   61.,   57.,   -2.,  -10.,   93., 1915
     5           -228.,    8.,  -51.,  -26.,   49.,   23.,  -98.,  -62., 1915
     6             72.,  -54.,  -48.,    2.,  -14.,   31.,  -12.,  -38., 1915
     7              2.,  -18.,   28.,   19.,  -15.,    6.,  -22.,   11., 1915
     8              8.,    8.,   -4.,  -15.,   -9.,    6.,    2.,  -13., 1915
     9              3.,    5.,   -8.,   16.,    6.,   -5.,    8.,  -18., 1915
     a              8.,   10.,  -20.,    1.,   14.,  -11.,    5.,   12., 1915
     b             -3.,    1.,   -2.,   -2.,    8.,    2.,   10.,    0., 1915
     c             -2.,   -1.,    2.,   -3.,   -4.,    2.,    2.,    1., 1915
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1915
     e              0.,   -2.,    1.,    4.,    2.,    0.,    0.,   -6./ 1915
      data g4/ -31060.,-2317., 5845., -839., 2959.,-1259., 1407.,  823., 1920
     1           1111.,-1600., -445., 1205.,  103.,  839.,  293.,  889., 1920
     2            695.,  220.,  616., -134., -424., -153.,  199.,  -57., 1920
     3           -221.,  326., -122.,  236.,   58.,  -23.,  -38., -119., 1920
     4           -125.,  -62.,   43.,   61.,   55.,    0.,  -10.,   96., 1920
     5           -233.,   11.,  -46.,  -22.,   44.,   18., -101.,  -57., 1920
     6             73.,  -54.,  -49.,    2.,  -14.,   29.,  -13.,  -37., 1920
     7              4.,  -16.,   28.,   19.,  -16.,    6.,  -22.,   11., 1920
     8              7.,    8.,   -3.,  -15.,   -9.,    6.,    2.,  -14., 1920
     9              4.,    5.,   -7.,   17.,    6.,   -5.,    8.,  -19., 1920
     a              8.,   10.,  -20.,    1.,   14.,  -11.,    5.,   12., 1920
     b             -3.,    1.,   -2.,   -2.,    9.,    2.,   10.,    0., 1920
     c             -2.,   -1.,    2.,   -3.,   -4.,    2.,    2.,    1., 1920
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1920
     e              0.,   -2.,    1.,    4.,    3.,    0.,    0.,   -6./ 1920
      data g5/ -30926.,-2318., 5817., -893., 2969.,-1334., 1471.,  728., 1925
     1           1140.,-1645., -462., 1202.,  119.,  881.,  229.,  891., 1925
     2            711.,  216.,  601., -163., -426., -130.,  217.,  -70., 1925
     3           -230.,  326.,  -96.,  226.,   58.,  -28.,  -44., -125., 1925
     4           -122.,  -69.,   51.,   61.,   54.,    3.,   -9.,   99., 1925
     5           -238.,   14.,  -40.,  -18.,   39.,   13., -103.,  -52., 1925
     6             73.,  -54.,  -50.,    3.,  -14.,   27.,  -14.,  -35., 1925
     7              5.,  -14.,   29.,   19.,  -17.,    6.,  -21.,   11., 1925
     8              7.,    8.,   -3.,  -15.,   -9.,    6.,    2.,  -14., 1925
     9              4.,    5.,   -7.,   17.,    7.,   -5.,    8.,  -19., 1925
     a              8.,   10.,  -20.,    1.,   14.,  -11.,    5.,   12., 1925
     b             -3.,    1.,   -2.,   -2.,    9.,    2.,   10.,    0., 1925
     c             -2.,   -1.,    2.,   -3.,   -4.,    2.,    2.,    1., 1925
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1925
     e              0.,   -2.,    1.,    4.,    3.,    0.,    0.,   -6./ 1925
      data g6/ -30805.,-2316., 5808., -951., 2980.,-1424., 1517.,  644., 1930
     1           1172.,-1692., -480., 1205.,  133.,  907.,  166.,  896., 1930
     2            727.,  205.,  584., -195., -422., -109.,  234.,  -90., 1930
     3           -237.,  327.,  -72.,  218.,   60.,  -32.,  -53., -131., 1930
     4           -118.,  -74.,   58.,   60.,   53.,    4.,   -9.,  102., 1930
     5           -242.,   19.,  -32.,  -16.,   32.,    8., -104.,  -46., 1930
     6             74.,  -54.,  -51.,    4.,  -15.,   25.,  -14.,  -34., 1930
     7              6.,  -12.,   29.,   18.,  -18.,    6.,  -20.,   11., 1930
     8              7.,    8.,   -3.,  -15.,   -9.,    5.,    2.,  -14., 1930
     9              5.,    5.,   -6.,   18.,    8.,   -5.,    8.,  -19., 1930
     a              8.,   10.,  -20.,    1.,   14.,  -12.,    5.,   12., 1930
     b             -3.,    1.,   -2.,   -2.,    9.,    3.,   10.,    0., 1930
     c             -2.,   -2.,    2.,   -3.,   -4.,    2.,    2.,    1., 1930
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1930
     e              0.,   -2.,    1.,    4.,    3.,    0.,    0.,   -6./ 1930
      data g7/ -30715.,-2306., 5812.,-1018., 2984.,-1520., 1550.,  586., 1935
     1           1206.,-1740., -494., 1215.,  146.,  918.,  101.,  903., 1935
     2            744.,  188.,  565., -226., -415.,  -90.,  249., -114., 1935
     3           -241.,  329.,  -51.,  211.,   64.,  -33.,  -64., -136., 1935
     4           -115.,  -76.,   64.,   59.,   53.,    4.,   -8.,  104., 1935
     5           -246.,   25.,  -25.,  -15.,   25.,    4., -106.,  -40., 1935
     6             74.,  -53.,  -52.,    4.,  -17.,   23.,  -14.,  -33., 1935
     7              7.,  -11.,   29.,   18.,  -19.,    6.,  -19.,   11., 1935
     8              7.,    8.,   -3.,  -15.,   -9.,    5.,    1.,  -15., 1935
     9              6.,    5.,   -6.,   18.,    8.,   -5.,    7.,  -19., 1935
     a              8.,   10.,  -20.,    1.,   15.,  -12.,    5.,   11., 1935
     b             -3.,    1.,   -3.,   -2.,    9.,    3.,   11.,    0., 1935
     c             -2.,   -2.,    2.,   -3.,   -4.,    2.,    2.,    1., 1935
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1935
     e              0.,   -1.,    2.,    4.,    3.,    0.,    0.,   -6./ 1935
      data g8/ -30654.,-2292., 5821.,-1106., 2981.,-1614., 1566.,  528., 1940
     1           1240.,-1790., -499., 1232.,  163.,  916.,   43.,  914., 1940
     2            762.,  169.,  550., -252., -405.,  -72.,  265., -141., 1940
     3           -241.,  334.,  -33.,  208.,   71.,  -33.,  -75., -141., 1940
     4           -113.,  -76.,   69.,   57.,   54.,    4.,   -7.,  105., 1940
     5           -249.,   33.,  -18.,  -15.,   18.,    0., -107.,  -33., 1940
     6             74.,  -53.,  -52.,    4.,  -18.,   20.,  -14.,  -31., 1940
     7              7.,   -9.,   29.,   17.,  -20.,    5.,  -19.,   11., 1940
     8              7.,    8.,   -3.,  -14.,  -10.,    5.,    1.,  -15., 1940
     9              6.,    5.,   -5.,   19.,    9.,   -5.,    7.,  -19., 1940
     a              8.,   10.,  -21.,    1.,   15.,  -12.,    5.,   11., 1940
     b             -3.,    1.,   -3.,   -2.,    9.,    3.,   11.,    1., 1940
     c             -2.,   -2.,    2.,   -3.,   -4.,    2.,    2.,    1., 1940
     d             -5.,    2.,   -2.,    6.,    6.,   -4.,    4.,    0., 1940
     e              0.,   -1.,    2.,    4.,    3.,    0.,    0.,   -6./ 1940
      data g9/ -30594.,-2285., 5810.,-1244., 2990.,-1702., 1578.,  477., 1945
     1           1282.,-1834., -499., 1255.,  186.,  913.,  -11.,  944., 1945
     2            776.,  144.,  544., -276., -421.,  -55.,  304., -178., 1945
     3           -253.,  346.,  -12.,  194.,   95.,  -20.,  -67., -142., 1945
     4           -119.,  -82.,   82.,   59.,   57.,    6.,    6.,  100., 1945
     5           -246.,   16.,  -25.,   -9.,   21.,  -16., -104.,  -39., 1945
     6             70.,  -40.,  -45.,    0.,  -18.,    0.,    2.,  -29., 1945
     7              6.,  -10.,   28.,   15.,  -17.,   29.,  -22.,   13., 1945
     8              7.,   12.,   -8.,  -21.,   -5.,  -12.,    9.,   -7., 1945
     9              7.,    2.,  -10.,   18.,    7.,    3.,    2.,  -11., 1945
     a              5.,  -21.,  -27.,    1.,   17.,  -11.,   29.,    3., 1945
     b             -9.,   16.,    4.,   -3.,    9.,   -4.,    6.,   -3., 1945
     c              1.,   -4.,    8.,   -3.,   11.,    5.,    1.,    1., 1945
     d              2.,  -20.,   -5.,   -1.,   -1.,   -6.,    8.,    6., 1945
     e             -1.,   -4.,   -3.,   -2.,    5.,    0.,   -2.,   -2./ 1945
      data ga/ -30554.,-2250., 5815.,-1341., 2998.,-1810., 1576.,  381., 1950
     1           1297.,-1889., -476., 1274.,  206.,  896.,  -46.,  954., 1950
     2            792.,  136.,  528., -278., -408.,  -37.,  303., -210., 1950
     3           -240.,  349.,    3.,  211.,  103.,  -20.,  -87., -147., 1950
     4           -122.,  -76.,   80.,   54.,   57.,   -1.,    4.,   99., 1950
     5           -247.,   33.,  -16.,  -12.,   12.,  -12., -105.,  -30., 1950
     6             65.,  -55.,  -35.,    2.,  -17.,    1.,    0.,  -40., 1950
     7             10.,   -7.,   36.,    5.,  -18.,   19.,  -16.,   22., 1950
     8             15.,    5.,   -4.,  -22.,   -1.,    0.,   11.,  -21., 1950
     9             15.,   -8.,  -13.,   17.,    5.,   -4.,   -1.,  -17., 1950
     a              3.,   -7.,  -24.,   -1.,   19.,  -25.,   12.,   10., 1950
     b              2.,    5.,    2.,   -5.,    8.,   -2.,    8.,    3., 1950
     c            -11.,    8.,   -7.,   -8.,    4.,   13.,   -1.,   -2., 1950
     d             13.,  -10.,   -4.,    2.,    4.,   -3.,   12.,    6., 1950
     e              3.,   -3.,    2.,    6.,   10.,   11.,    3.,    8./ 1950
      data gb/ -30500.,-2215., 5820.,-1440., 3003.,-1898., 1581.,  291., 1955
     1           1302.,-1944., -462., 1288.,  216.,  882.,  -83.,  958., 1955
     2            796.,  133.,  510., -274., -397.,  -23.,  290., -230., 1955
     3           -229.,  360.,   15.,  230.,  110.,  -23.,  -98., -152., 1955
     4           -121.,  -69.,   78.,   47.,   57.,   -9.,    3.,   96., 1955
     5           -247.,   48.,   -8.,  -16.,    7.,  -12., -107.,  -24., 1955
     6             65.,  -56.,  -50.,    2.,  -24.,   10.,   -4.,  -32., 1955
     7              8.,  -11.,   28.,    9.,  -20.,   18.,  -18.,   11., 1955
     8              9.,   10.,   -6.,  -15.,  -14.,    5.,    6.,  -23., 1955
     9             10.,    3.,   -7.,   23.,    6.,   -4.,    9.,  -13., 1955
     a              4.,    9.,  -11.,   -4.,   12.,   -5.,    7.,    2., 1955
     b              6.,    4.,   -2.,    1.,   10.,    2.,    7.,    2., 1955
     c             -6.,    5.,    5.,   -3.,   -5.,   -4.,   -1.,    0., 1955
     d              2.,   -8.,   -3.,   -2.,    7.,   -4.,    4.,    1., 1955
     e             -2.,   -3.,    6.,    7.,   -2.,   -1.,    0.,   -3./ 1955
      data gc/ -30421.,-2169., 5791.,-1555., 3002.,-1967., 1590.,  206., 1960
     1           1302.,-1992., -414., 1289.,  224.,  878., -130.,  957., 1960
     2            800.,  135.,  504., -278., -394.,    3.,  269., -255., 1960
     3           -222.,  362.,   16.,  242.,  125.,  -26., -117., -156., 1960
     4           -114.,  -63.,   81.,   46.,   58.,  -10.,    1.,   99., 1960
     5           -237.,   60.,   -1.,  -20.,   -2.,  -11., -113.,  -17., 1960
     6             67.,  -56.,  -55.,    5.,  -28.,   15.,   -6.,  -32., 1960
     7              7.,   -7.,   23.,   17.,  -18.,    8.,  -17.,   15., 1960
     8              6.,   11.,   -4.,  -14.,  -11.,    7.,    2.,  -18., 1960
     9             10.,    4.,   -5.,   23.,   10.,    1.,    8.,  -20., 1960
     a              4.,    6.,  -18.,    0.,   12.,   -9.,    2.,    1., 1960
     b              0.,    4.,   -3.,   -1.,    9.,   -2.,    8.,    3., 1960
     c              0.,   -1.,    5.,    1.,   -3.,    4.,    4.,    1., 1960
     d              0.,    0.,   -1.,    2.,    4.,   -5.,    6.,    1., 1960
     e              1.,   -1.,   -1.,    6.,    2.,    0.,    0.,   -7./ 1960
      data gd/ -30334.,-2119., 5776.,-1662., 2997.,-2016., 1594.,  114., 1965
     1           1297.,-2038., -404., 1292.,  240.,  856., -165.,  957., 1965
     2            804.,  148.,  479., -269., -390.,   13.,  252., -269., 1965
     3           -219.,  358.,   19.,  254.,  128.,  -31., -126., -157., 1965
     4            -97.,  -62.,   81.,   45.,   61.,  -11.,    8.,  100., 1965
     5           -228.,   68.,    4.,  -32.,    1.,   -8., -111.,   -7., 1965
     6             75.,  -57.,  -61.,    4.,  -27.,   13.,   -2.,  -26., 1965
     7              6.,   -6.,   26.,   13.,  -23.,    1.,  -12.,   13., 1965
     8              5.,    7.,   -4.,  -12.,  -14.,    9.,    0.,  -16., 1965
     9              8.,    4.,   -1.,   24.,   11.,   -3.,    4.,  -17., 1965
     a              8.,   10.,  -22.,    2.,   15.,  -13.,    7.,   10., 1965
     b             -4.,   -1.,   -5.,   -1.,   10.,    5.,   10.,    1., 1965
     c             -4.,   -2.,    1.,   -2.,   -3.,    2.,    2.,    1., 1965
     d             -5.,    2.,   -2.,    6.,    4.,   -4.,    4.,    0., 1965
     e              0.,   -2.,    2.,    3.,    2.,    0.,    0.,   -6./ 1965
      data ge/ -30220.,-2068., 5737.,-1781., 3000.,-2047., 1611.,   25., 1970
     1           1287.,-2091., -366., 1278.,  251.,  838., -196.,  952., 1970
     2            800.,  167.,  461., -266., -395.,   26.,  234., -279., 1970
     3           -216.,  359.,   26.,  262.,  139.,  -42., -139., -160., 1970
     4            -91.,  -56.,   83.,   43.,   64.,  -12.,   15.,  100., 1970
     5           -212.,   72.,    2.,  -37.,    3.,   -6., -112.,    1., 1970
     6             72.,  -57.,  -70.,    1.,  -27.,   14.,   -4.,  -22., 1970
     7              8.,   -2.,   23.,   13.,  -23.,   -2.,  -11.,   14., 1970
     8              6.,    7.,   -2.,  -15.,  -13.,    6.,   -3.,  -17., 1970
     9              5.,    6.,    0.,   21.,   11.,   -6.,    3.,  -16., 1970
     a              8.,   10.,  -21.,    2.,   16.,  -12.,    6.,   10., 1970
     b             -4.,   -1.,   -5.,    0.,   10.,    3.,   11.,    1., 1970
     c             -2.,   -1.,    1.,   -3.,   -3.,    1.,    2.,    1., 1970
     d             -5.,    3.,   -1.,    4.,    6.,   -4.,    4.,    0., 1970
     e              1.,   -1.,    0.,    3.,    3.,    1.,   -1.,   -4./ 1970
      data gf/ -30100.,-2013., 5675.,-1902., 3010.,-2067., 1632.,  -68., 1975
     1           1276.,-2144., -333., 1260.,  262.,  830., -223.,  946., 1975
     2            791.,  191.,  438., -265., -405.,   39.,  216., -288., 1975
     3           -218.,  356.,   31.,  264.,  148.,  -59., -152., -159., 1975
     4            -83.,  -49.,   88.,   45.,   66.,  -13.,   28.,   99., 1975
     5           -198.,   75.,    1.,  -41.,    6.,   -4., -111.,   11., 1975
     6             71.,  -56.,  -77.,    1.,  -26.,   16.,   -5.,  -14., 1975
     7             10.,    0.,   22.,   12.,  -23.,   -5.,  -12.,   14., 1975
     8              6.,    6.,   -1.,  -16.,  -12.,    4.,   -8.,  -19., 1975
     9              4.,    6.,    0.,   18.,   10.,  -10.,    1.,  -17., 1975
     a              7.,   10.,  -21.,    2.,   16.,  -12.,    7.,   10., 1975
     b             -4.,   -1.,   -5.,   -1.,   10.,    4.,   11.,    1., 1975
     c             -3.,   -2.,    1.,   -3.,   -3.,    1.,    2.,    1., 1975
     d             -5.,    3.,   -2.,    4.,    5.,   -4.,    4.,   -1., 1975
     e              1.,   -1.,    0.,    3.,    3.,    1.,   -1.,   -5./ 1975
      data gg/ -29992.,-1956., 5604.,-1997., 3027.,-2129., 1663., -200., 1980
     1           1281.,-2180., -336., 1251.,  271.,  833., -252.,  938., 1980
     2            782.,  212.,  398., -257., -419.,   53.,  199., -297., 1980
     3           -218.,  357.,   46.,  261.,  150.,  -74., -151., -162., 1980
     4            -78.,  -48.,   92.,   48.,   66.,  -15.,   42.,   93., 1980
     5           -192.,   71.,    4.,  -43.,   14.,   -2., -108.,   17., 1980
     6             72.,  -59.,  -82.,    2.,  -27.,   21.,   -5.,  -12., 1980
     7             16.,    1.,   18.,   11.,  -23.,   -2.,  -10.,   18., 1980
     8              6.,    7.,    0.,  -18.,  -11.,    4.,   -7.,  -22., 1980
     9              4.,    9.,    3.,   16.,    6.,  -13.,   -1.,  -15., 1980
     a              5.,   10.,  -21.,    1.,   16.,  -12.,    9.,    9., 1980
     b             -5.,   -3.,   -6.,   -1.,    9.,    7.,   10.,    2., 1980
     c             -6.,   -5.,    2.,   -4.,   -4.,    1.,    2.,    0., 1980
     d             -5.,    3.,   -2.,    6.,    5.,   -4.,    3.,    0., 1980
     e              1.,   -1.,    2.,    4.,    3.,    0.,    0.,   -6./ 1980
      data gi/ -29873.,-1905., 5500.,-2072., 3044.,-2197., 1687., -306., 1985
     1           1296.,-2208., -310., 1247.,  284.,  829., -297.,  936., 1985
     2            780.,  232.,  361., -249., -424.,   69.,  170., -297., 1985
     3           -214.,  355.,   47.,  253.,  150.,  -93., -154., -164., 1985
     4            -75.,  -46.,   95.,   53.,   65.,  -16.,   51.,   88., 1985
     5           -185.,   69.,    4.,  -48.,   16.,   -1., -102.,   21., 1985
     6             74.,  -62.,  -83.,    3.,  -27.,   24.,   -2.,   -6., 1985
     7             20.,    4.,   17.,   10.,  -23.,    0.,   -7.,   21., 1985
     8              6.,    8.,    0.,  -19.,  -11.,    5.,   -9.,  -23., 1985
     9              4.,   11.,    4.,   14.,    4.,  -15.,   -4.,  -11., 1985
     a              5.,   10.,  -21.,    1.,   15.,  -12.,    9.,    9., 1985
     b             -6.,   -3.,   -6.,   -1.,    9.,    7.,    9.,    1., 1985
     c             -7.,   -5.,    2.,   -4.,   -4.,    1.,    3.,    0., 1985
     d             -5.,    3.,   -2.,    6.,    5.,   -4.,    3.,    0., 1985
     e              1.,   -1.,    2.,    4.,    3.,    0.,    0.,   -6./ 1985
      data gj/ -29775.,-1848., 5406.,-2131., 3059.,-2279., 1686., -373., 1990
     1           1314.,-2239., -284., 1248.,  293.,  802., -352.,  939., 1990
     2            780.,  247.,  325., -240., -423.,   84.,  141., -299., 1990
     3           -214.,  353.,   46.,  245.,  154., -109., -153., -165., 1990
     4            -69.,  -36.,   97.,   61.,   65.,  -16.,   59.,   82., 1990
     5           -178.,   69.,    3.,  -52.,   18.,    1.,  -96.,   24., 1990
     6             77.,  -64.,  -80.,    2.,  -26.,   26.,    0.,   -1., 1990
     7             21.,    5.,   17.,    9.,  -23.,    0.,   -4.,   23., 1990
     8              5.,   10.,   -1.,  -19.,  -10.,    6.,  -12.,  -22., 1990
     9              3.,   12.,    4.,   12.,    2.,  -16.,   -6.,  -10., 1990
     a              4.,    9.,  -20.,    1.,   15.,  -12.,   11.,    9., 1990
     b             -7.,   -4.,   -7.,   -2.,    9.,    7.,    8.,    1., 1990
     c             -7.,   -6.,    2.,   -3.,   -4.,    2.,    2.,    1., 1990
     d             -5.,    3.,   -2.,    6.,    4.,   -4.,    3.,    0., 1990
     e              1.,   -2.,    3.,    3.,    3.,   -1.,    0.,   -6./ 1990
      data gk/ -29692.,-1784., 5306.,-2200., 3070.,-2366., 1681., -413., 1995
     1           1335.,-2267., -262., 1249.,  302.,  759., -427.,  940., 1995
     2            780.,  262.,  290., -236., -418.,   97.,  122., -306., 1995
     3           -214.,  352.,   46.,  235.,  165., -118., -143., -166., 1995
     4            -55.,  -17.,  107.,   68.,   67.,  -17.,   68.,   72., 1995
     5           -170.,   67.,   -1.,  -58.,   19.,    1.,  -93.,   36., 1995
     6             77.,  -72.,  -69.,    1.,  -25.,   28.,    4.,    5., 1995
     7             24.,    4.,   17.,    8.,  -24.,   -2.,   -6.,   25., 1995
     8              6.,   11.,   -6.,  -21.,   -9.,    8.,  -14.,  -23., 1995
     9              9.,   15.,    6.,   11.,   -5.,  -16.,   -7.,   -4., 1995
     a              4.,    9.,  -20.,    3.,   15.,  -10.,   12.,    8., 1995
     b             -6.,   -8.,   -8.,   -1.,    8.,   10.,    5.,   -2., 1995
     c             -8.,   -8.,    3.,   -3.,   -6.,    1.,    2.,    0., 1995
     d             -4.,    4.,   -1.,    5.,    4.,   -5.,    2.,   -1., 1995
     e              2.,   -2.,    5.,    1.,    1.,   -2.,    0.,   -7., 1995
     f           75*0./                                                  1995
      data gl/ -29619.4,-1728.2, 5186.1,-2267.7, 3068.4,-2481.6, 1670.9, 2000
     1           -458.0, 1339.6,-2288.0, -227.6, 1252.1,  293.4,  714.5, 2000
     2           -491.1,  932.3,  786.8,  272.6,  250.0, -231.9, -403.0, 2000
     3            119.8,  111.3, -303.8, -218.8,  351.4,   43.8,  222.3, 2000
     4            171.9, -130.4, -133.1, -168.6,  -39.3,  -12.9,  106.3, 2000
     5             72.3,   68.2,  -17.4,   74.2,   63.7, -160.9,   65.1, 2000
     6             -5.9,  -61.2,   16.9,    0.7,  -90.4,   43.8,   79.0, 2000
     7            -74.0,  -64.6,    0.0,  -24.2,   33.3,    6.2,    9.1, 2000
     8             24.0,    6.9,   14.8,    7.3,  -25.4,   -1.2,   -5.8, 2000
     9             24.4,    6.6,   11.9,   -9.2,  -21.5,   -7.9,    8.5, 2000
     a            -16.6,  -21.5,    9.1,   15.5,    7.0,    8.9,   -7.9, 2000
     b            -14.9,   -7.0,   -2.1,    5.0,    9.4,  -19.7,    3.0, 2000
     c             13.4,   -8.4,   12.5,    6.3,   -6.2,   -8.9,   -8.4, 2000
     d             -1.5,    8.4,    9.3,    3.8,   -4.3,   -8.2,   -8.2, 2000
     e              4.8,   -2.6,   -6.0,    1.7,    1.7,    0.0,   -3.1, 2000
     f              4.0,   -0.5,    4.9,    3.7,   -5.9,    1.0,   -1.2, 2000
     g              2.0,   -2.9,    4.2,    0.2,    0.3,   -2.2,   -1.1, 2000
     h             -7.4,    2.7,   -1.7,    0.1,   -1.9,    1.3,    1.5, 2000
     i             -0.9,   -0.1,   -2.6,    0.1,    0.9,   -0.7,   -0.7, 2000
     j              0.7,   -2.8,    1.7,   -0.9,    0.1,   -1.2,    1.2, 2000
     k             -1.9,    4.0,   -0.9,   -2.2,   -0.3,   -0.4,    0.2, 2000
     l              0.3,    0.9,    2.5,   -0.2,   -2.6,    0.9,    0.7, 2000
     m             -0.5,    0.3,    0.3,    0.0,   -0.3,    0.0,   -0.4, 2000
     n              0.3,   -0.1,   -0.9,   -0.2,   -0.4,   -0.4,    0.8, 2000
     o             -0.2,   -0.9,   -0.9,    0.3,    0.2,    0.1,    1.8, 2000
     p             -0.4,   -0.4,    1.3,   -1.0,   -0.4,   -0.1,    0.7, 2000
     q              0.7,   -0.4,    0.3,    0.3,    0.6,   -0.1,    0.3, 2000
     r              0.4,   -0.2,    0.0,   -0.5,    0.1,   -0.9/         2000
      data gm/-29554.63,-1669.05, 5077.99,-2337.24, 3047.69,-2594.50,    2005
     1          1657.76, -515.43, 1336.30,-2305.83, -198.86, 1246.39,    2005
     2           269.72,  672.51, -524.72,  920.55,  797.96,  282.07,    2005
     3           210.65, -225.23, -379.86,  145.15,  100.00, -305.36,    2005
     4          -227.00,  354.41,   42.72,  208.95,  180.25, -136.54,    2005
     5          -123.45, -168.05,  -19.57,  -13.55,  103.85,   73.60,    2005
     6            69.56,  -20.33,   76.74,   54.75, -151.34,   63.63,    2005
     7           -14.58,  -63.53,   14.58,    0.24,  -86.36,   50.94,    2005
     8            79.88,  -74.46,  -61.14,   -1.65,  -22.57,   38.73,    2005
     9             6.82,   12.30,   25.35,    9.37,   10.93,    5.42,    2005
     a           -26.32,    1.94,   -4.64,   24.80,    7.62,   11.20,    2005
     b           -11.73,  -20.88,   -6.88,    9.83,  -18.11,  -19.71,    2005
     c            10.17,   16.22,    9.36,    7.61,  -11.25,  -12.76,    2005
     d            -4.87,   -0.06,    5.58,    9.76,  -20.11,    3.58,    2005
     e            12.69,   -6.94,   12.67,    5.01,   -6.72,  -10.76,    2005
     f            -8.16,   -1.25,    8.10,    8.76,    2.92,   -6.66,    2005
     g            -7.73,   -9.22,    6.01,   -2.17,   -6.12,    2.19,    2005
     h             1.42,    0.10,   -2.35,    4.46,   -0.15,    4.76,    2005
     i             3.06,   -6.58,    0.29,   -1.01,    2.06,   -3.47,    2005
     j             3.77,   -0.86,   -0.21,   -2.31,   -2.09,   -7.93,    2005
     k             2.95,   -1.60,    0.26,   -1.88,    1.44,    1.44,    2005
     l            -0.77,   -0.31,   -2.27,    0.29,    0.90,   -0.79,    2005
     m            -0.58,    0.53,   -2.69,    1.80,   -1.08,    0.16,    2005
     n            -1.58,    0.96,   -1.90,    3.99,   -1.39,   -2.15,    2005
     o            -0.29,   -0.55,    0.21,    0.23,    0.89,    2.38,    2005
     p            -0.38,   -2.63,    0.96,    0.61,   -0.30,    0.40,    2005
     q             0.46,    0.01,   -0.35,    0.02,   -0.36,    0.28,    2005
     r             0.08,   -0.87,   -0.49,   -0.34,   -0.08,    0.88,    2005
     s            -0.16,   -0.88,   -0.76,    0.30,    0.33,    0.28,    2005
     t             1.72,   -0.43,   -0.54,    1.18,   -1.07,   -0.37,    2005
     u            -0.04,    0.75,    0.63,   -0.26,    0.21,    0.35,    2005
     v             0.53,   -0.05,    0.38,    0.41,   -0.22,   -0.10,    2005
     w            -0.57,   -0.18,   -0.82/                               2005
      data gp/-29496.57,-1586.42, 4944.26,-2396.06, 3026.34,-2708.54,    2010
     1          1668.17, -575.73, 1339.85,-2326.54, -160.40, 1232.10,    2010
     2           251.75,  633.73, -537.03,  912.66,  808.97,  286.48,    2010
     3           166.58, -211.03, -356.83,  164.46,   89.40, -309.72,    2010
     4          -230.87,  357.29,   44.58,  200.26,  189.01, -141.05,    2010
     5          -118.06, -163.17,   -0.01,   -8.03,  101.04,   72.78,    2010
     6            68.69,  -20.90,   75.92,   44.18, -141.40,   61.54,    2010
     7           -22.83,  -66.26,   13.10,    3.02,  -78.09,   55.40,    2010
     8            80.44,  -75.00,  -57.80,   -4.55,  -21.20,   45.24,    2010
     9             6.54,   14.00,   24.96,   10.46,    7.03,    1.64,    2010
     a           -27.61,    4.92,   -3.28,   24.41,    8.21,   10.84,    2010
     b           -14.50,  -20.03,   -5.59,   11.83,  -19.34,  -17.41,    2010
     c            11.61,   16.71,   10.85,    6.96,  -14.05,  -10.74,    2010
     d            -3.54,    1.64,    5.50,    9.45,  -20.54,    3.45,    2010
     e            11.51,   -5.27,   12.75,    3.13,   -7.14,  -12.38,    2010
     f            -7.42,   -0.76,    7.97,    8.43,    2.14,   -8.42,    2010
     g            -6.08,  -10.08,    7.01,   -1.94,   -6.24,    2.73,    2010
     h             0.89,   -0.10,   -1.07,    4.71,   -0.16,    4.44,    2010
     i             2.45,   -7.22,   -0.33,   -0.96,    2.13,   -3.95,    2010
     j             3.09,   -1.99,   -1.03,   -1.97,   -2.80,   -8.31,    2010
     k             3.05,   -1.48,    0.13,   -2.03,    1.67,    1.65,    2010
     l            -0.66,   -0.51,   -1.76,    0.54,    0.85,   -0.79,    2010
     m            -0.39,    0.37,   -2.51,    1.79,   -1.27,    0.12,    2010
     n            -2.11,    0.75,   -1.94,    3.75,   -1.86,   -2.12,    2010
     o            -0.21,   -0.87,    0.30,    0.27,    1.04,    2.13,    2010
     p            -0.63,   -2.49,    0.95,    0.49,   -0.11,    0.59,    2010
     q             0.52,    0.00,   -0.39,    0.13,   -0.37,    0.27,    2010
     r             0.21,   -0.86,   -0.77,   -0.23,    0.04,    0.87,    2010
     s            -0.09,   -0.89,   -0.87,    0.31,    0.30,    0.42,    2010
     t             1.66,   -0.45,   -0.59,    1.08,   -1.14,   -0.31,    2010
     u            -0.07,    0.78,    0.54,   -0.18,    0.10,    0.38,    2010
     v             0.49,    0.02,    0.44,    0.42,   -0.25,   -0.26,    2010
     w            -0.53,   -0.26,   -0.79/                               2010
      data gq/-29441.46,-1501.77, 4795.99,-2445.88, 3012.20,-2845.41,    2015
     1          1676.35, -642.17, 1350.33,-2352.26, -115.29, 1225.85,    2015
     2           245.04,  581.69, -538.70,  907.42,  813.68,  283.54,    2015
     3           120.49, -188.43, -334.85,  180.95,   70.38, -329.23,    2015
     4          -232.91,  360.14,   46.98,  192.35,  196.98, -140.94,    2015
     5          -119.14, -157.40,   15.98,    4.30,  100.12,   69.55,    2015
     6            67.57,  -20.61,   72.79,   33.30, -129.85,   58.74,    2015
     7           -28.93,  -66.64,   13.14,    7.35,  -70.85,   62.41,    2015
     8            81.29,  -75.99,  -54.27,   -6.79,  -19.53,   51.82,    2015
     9             5.59,   15.07,   24.45,    9.32,    3.27,   -2.88,    2015
     a           -27.50,    6.61,   -2.32,   23.98,    8.89,   10.04,    2015
     b           -16.78,  -18.26,   -3.16,   13.18,  -20.56,  -14.60,    2015
     c            13.33,   16.16,   11.76,    5.69,  -15.98,   -9.10,    2015
     d            -2.02,    2.26,    5.33,    8.83,  -21.77,    3.02,    2015
     e            10.76,   -3.22,   11.74,    0.67,   -6.74,  -13.20,    2015
     f            -6.88,   -0.10,    7.79,    8.68,    1.04,   -9.06,    2015
     g            -3.89,  -10.54,    8.44,   -2.01,   -6.26,    3.28,    2015
     h             0.17,   -0.40,    0.55,    4.55,   -0.55,    4.40,    2015
     i             1.70,   -7.92,   -0.67,   -0.61,    2.13,   -4.16,    2015
     j             2.33,   -2.85,   -1.80,   -1.12,   -3.59,   -8.72,    2015
     k             3.00,   -1.40,    0.00,   -2.30,    2.11,    2.08,    2015
     l            -0.60,   -0.79,   -1.05,    0.58,    0.76,   -0.70,    2015
     m            -0.20,    0.14,   -2.12,    1.70,   -1.44,   -0.22,    2015
     n            -2.57,    0.44,   -2.01,    3.49,   -2.34,   -2.09,    2015
     o            -0.16,   -1.08,    0.46,    0.37,    1.23,    1.75,    2015
     p            -0.89,   -2.19,    0.85,    0.27,    0.10,    0.72,    2015
     q             0.54,   -0.09,   -0.37,    0.29,   -0.43,    0.23,    2015
     r             0.22,   -0.89,   -0.94,   -0.16,   -0.03,    0.72,    2015
     s            -0.02,   -0.92,   -0.88,    0.42,    0.49,    0.63,    2015
     t             1.56,   -0.42,   -0.50,    0.96,   -1.24,   -0.19,    2015
     u            -0.10,    0.81,    0.42,   -0.13,   -0.04,    0.38,    2015
     v             0.48,    0.08,    0.48,    0.46,   -0.30,   -0.35,    2015
     w            -0.43,   -0.36,   -0.71/                               2015
      data gr/-29403.41,-1451.37, 4653.35,-2499.78, 2981.96,-2991.72,    2020
     1          1676.85, -734.62, 1363.00,-2380.80,  -81.96, 1236.06,    2020
     2           241.80,  525.60, -542.52,  902.82,  809.47,  282.10,    2020
     3            86.18, -158.50, -309.47,  199.75,   47.44, -350.30,    2020
     4          -234.42,  363.26,   47.52,  187.86,  208.36, -140.73,    2020
     5          -121.43, -151.16,   32.09,   13.98,   99.14,   65.97,    2020
     6            65.56,  -19.22,   72.96,   25.02, -121.57,   52.76,    2020
     7           -36.06,  -64.40,   13.60,    8.96,  -64.80,   68.04,    2020
     8            80.54,  -76.63,  -51.50,   -8.23,  -16.85,   56.45,    2020
     9             2.36,   15.80,   23.56,    6.30,   -2.19,   -7.21,    2020
     a           -27.19,    9.77,   -1.90,   23.66,    9.74,    8.43,    2020
     b           -17.49,  -15.23,   -0.49,   12.83,  -21.07,  -11.76,    2020
     c            15.28,   14.94,   13.65,    3.62,  -16.59,   -6.90,    2020
     d            -0.34,    2.90,    5.03,    8.36,  -23.44,    2.84,    2020
     e            11.04,   -1.48,    9.86,   -1.14,   -5.13,  -13.22,    2020
     f            -6.20,    1.08,    7.79,    8.82,    0.40,   -9.23,    2020
     g            -1.44,  -11.86,    9.60,   -1.84,   -6.25,    3.38,    2020
     h            -0.11,   -0.18,    1.66,    3.50,   -0.86,    4.86,    2020
     i             0.65,   -8.62,   -0.88,   -0.11,    1.88,   -4.26,    2020
     j             1.44,   -3.43,   -2.38,   -0.10,   -3.84,   -8.84,    2020
     k             2.96,   -1.36,   -0.02,   -2.51,    2.50,    2.31,    2020
     l            -0.55,   -0.85,   -0.39,    0.28,    0.62,   -0.66,    2020
     m            -0.21,   -0.07,   -1.66,    1.44,   -1.60,   -0.59,    2020
     n            -2.98,    0.18,   -1.97,    3.09,   -2.51,   -2.00,    2020
     o            -0.13,   -1.15,    0.43,    0.52,    1.28,    1.37,    2020
     p            -1.14,   -1.81,    0.71,    0.08,    0.31,    0.71,    2020
     q             0.49,   -0.15,   -0.26,    0.55,   -0.47,    0.16,    2020
     r             0.09,   -0.93,   -1.13,   -0.04,   -0.33,    0.52,    2020
     s             0.08,   -0.93,   -0.88,    0.53,    0.64,    0.72,    2020
     t             1.40,   -0.30,   -0.38,    0.75,   -1.31,   -0.01,    2020
     u            -0.09,    0.76,    0.29,   -0.05,   -0.11,    0.37,    2020
     v             0.47,    0.13,    0.54,    0.45,   -0.41,   -0.46,    2020
     w            -0.36,   -0.40,   -0.60/                               2020
      data gs/ -29350.0, -1410.3,  4545.5, -2556.2,  2950.9, -3133.6,    2025
     1           1648.7,  -814.2,  1360.9, -2404.2,   -56.9,  1243.8,    2025
     2            237.6,   453.4,  -549.6,   894.7,   799.6,   278.6,    2025
     3             55.8,  -134.0,  -281.1,   212.0,    12.0,  -375.4,    2025
     4           -232.9,   369.0,    45.3,   187.2,   220.0,  -138.7,    2025
     5           -122.9,  -141.9,    42.9,    20.9,   106.2,    64.3,    2025
     6             63.8,   -18.4,    76.7,    16.8,  -115.7,    48.9,    2025
     7            -40.9,   -59.8,    14.9,    10.9,   -60.8,    72.8,    2025
     8             79.6,   -76.9,   -48.9,    -8.8,   -14.4,    59.3,    2025
     9             -1.0,    15.8,    23.5,     2.5,    -7.4,   -11.2,    2025
     a            -25.1,    14.3,    -2.2,    23.1,    10.9,     7.2,    2025
     b            -17.5,   -12.6,     2.0,    11.5,   -21.8,    -9.7,    2025
     c             16.9,    12.7,    14.9,     0.7,   -16.8,    -5.2,    2025
     d              1.0,     3.9,     4.7,     8.0,   -24.8,     3.0,    2025
     e             12.1,    -0.2,     8.3,    -2.5,    -3.4,   -13.1,    2025
     f             -5.3,     2.4,     7.2,     8.6,    -0.6,    -8.7,    2025
     g              0.8,   -12.8,     9.8,    -1.3,    -6.4,     3.3,    2025
     h              0.2,     0.1,     2.0,     2.5,    -1.0,     5.4,    2025
     i             -0.5,    -9.0,    -0.9,     0.4,     1.5,    -4.2,    2025
     j              0.9,    -3.8,    -2.6,     0.9,    -3.9,    -9.0,    2025
     k              3.0,    -1.4,     0.0,    -2.5,     2.8,     2.4,    2025
     l             -0.6,    -0.6,     0.1,     0.0,     0.5,    -0.6,    2025
     m             -0.3,    -0.1,    -1.2,     1.1,    -1.7,    -1.0,    2025
     n             -2.9,    -0.1,    -1.8,     2.6,    -2.3,    -2.0,    2025
     o             -0.1,    -1.2,     0.4,     0.6,     1.2,     1.0,    2025
     p             -1.2,    -1.5,     0.6,     0.0,     0.5,     0.6,    2025
     q              0.5,    -0.2,    -0.1,     0.8,    -0.5,     0.1,    2025
     r             -0.2,    -0.9,    -1.2,     0.1,    -0.7,     0.2,    2025
     s              0.2,    -0.9,    -0.9,     0.6,     0.7,     0.7,    2025
     t              1.2,    -0.2,    -0.3,     0.5,    -1.3,     0.1,    2025
     u             -0.1,     0.7,     0.2,     0.0,    -0.2,     0.3,    2025
     v              0.5,     0.2,     0.6,     0.4,    -0.6,    -0.5,    2025
     w             -0.3,    -0.4,    -0.5/                               2025
      data gt/     12.6,    10.0,   -21.5,   -11.2,    -5.3,   -27.3,    2027
     1             -8.3,   -11.1,    -1.5,    -4.4,     3.8,     0.4,    2027
     2             -0.2,   -15.6,    -3.9,    -1.7,    -2.3,    -1.3,    2027
     3             -5.8,     4.1,     5.4,     1.6,    -6.8,    -4.1,    2027
     4              0.6,     1.3,    -0.5,     0.0,     2.1,     0.7,    2027
     5              0.5,     2.3,     1.7,     1.0,     1.9,    -0.2,    2027
     6             -0.3,     0.3,     0.8,    -1.6,     1.2,    -0.4,    2027
     7             -0.8,     0.8,     0.4,     0.7,     0.9,     0.9,    2027
     8             -0.1,    -0.1,     0.6,    -0.1,     0.5,     0.5,    2027
     9             -0.7,    -0.1,     0.0,    -0.8,    -0.9,    -0.8,    2027
     a              0.5,     0.9,    -0.3,    -0.1,     0.2,    -0.3,    2027
     b              0.0,     0.4,     0.4,    -0.3,    -0.1,     0.4,    2027
     c              0.3,    -0.5,     0.1,    -0.6,     0.0,     0.3,    2027
     d              0.3,     0.2, 115*0.0/                               2027
c
c     set initial values
c
      x     = 0.0
      y     = 0.0
      z     = 0.0
      if (date.lt.1900.0.or.date.gt.2035.0) go to 11
      if (date.gt.2030.0) write (6,960) date
  960 format (/' This version of the IGRF is intended for use up',
     1        ' to 2030.0.'/' values for',f9.3,' will be computed',
     2        ' but may be of reduced accuracy'/)
      if (date.ge.2025.0) go to 1
      t     = 0.2*(date - 1900.0)                                             
      ll    = t
      one   = ll
      t     = t - one
c
c     SH models before 1995.0 are only to degree 10
c
      if (date.lt.1995.0) then
       nmx   = 10
       nc    = nmx*(nmx+2)
       ll    = nc*ll
       kmx   = (nmx+1)*(nmx+2)/2
      else
       nmx   = 13
       nc    = nmx*(nmx+2)
       ll    = 0.2*(date - 1995.0)
c
c     19 is the number of SH models that extend to degree 10
c
       ll    = 120*19 + nc*ll
       kmx   = (nmx+1)*(nmx+2)/2
      endif
      tc    = 1.0 - t
      if (isv.eq.1) then
       tc = -0.2
       t = 0.2
      end if
      go to 2
c
    1 t     = date - 2025.0
      tc    = 1.0
      if (isv.eq.1) then
       t = 1.0
       tc = 0.0
      end if
c
c     pointer for last coefficient in pen-ultimate set of MF coefficients...
c
      ll    = 3450
      nmx   = 13
      nc    = nmx*(nmx+2)
      kmx   = (nmx+1)*(nmx+2)/2
    2 r     = alt
      one   = colat*0.017453292
      ct    = cos(one)
      st    = sin(one)
      one   = elong*0.017453292
      cl(1) = cos(one)
      sl(1) = sin(one)
      cd    = 1.0
      sd    = 0.0
      l     = 1
      m     = 1
      n     = 0
      if (itype.eq.2) go to 3
c
c     conversion from geodetic to geocentric coordinates 
c     (using the WGS84 spheroid)
c
      a2    = 40680631.6
      b2    = 40408296.0
      one   = a2*st*st
      two   = b2*ct*ct
      three = one + two
      rho   = sqrt(three)
      r     = sqrt(alt*(alt + 2.0*rho) + (a2*one + b2*two)/three)
      cd    = (alt + rho)/r
      sd    = (a2 - b2)/rho*ct*st/r
      one   = ct
      ct    = ct*cd -  st*sd
      st    = st*cd + one*sd
c
    3 ratio = 6371.2/r
      rr    = ratio*ratio
c
c     computation of Schmidt quasi-normal coefficients p and x(=q)
c
      p(1)  = 1.0
      p(3)  = st
      q(1)  = 0.0
      q(3)  =  ct
      do 10 k=2,kmx                                                       
       if (n.ge.m) go to 4
       m     = 0
       n     = n + 1
       rr    = rr*ratio
       fn    = n
       gn    = n - 1
    4  fm    = m
       if (m.ne.n) go to 5
       if (k.eq.3) go to 6
       one   = sqrt(1.0 - 0.5/fm)
       j     = k - n - 1
       p(k)  = one*st*p(j)
       q(k)  = one*(st*q(j) + ct*p(j))
       cl(m) = cl(m-1)*cl(1) - sl(m-1)*sl(1)
       sl(m) = sl(m-1)*cl(1) + cl(m-1)*sl(1)
       go to 6                                                           
    5  gmm    = m*m
       one   = sqrt(fn*fn - gmm)
       two   = sqrt(gn*gn - gmm)/one
       three = (fn + gn)/one
       i     = k - n
       j     = i - n + 1
       p(k)  = three*ct*p(i) - two*p(j)
       q(k)  = three*(ct*q(i) - st*p(i)) - two*q(j)
c
c     synthesis of x, y and z in geocentric coordinates
c
    6  lm    = ll + l
       one   = (tc*gh(lm) + t*gh(lm+nc))*rr                                     
       if (m.eq.0) go to 9                                                      
       two   = (tc*gh(lm+1) + t*gh(lm+nc+1))*rr
       three = one*cl(m) + two*sl(m)
       x     = x + three*q(k)
       z     = z - (fn + 1.0)*three*p(k)
       if (st.eq.0.0) go to 7
       y     = y + (one*sl(m) - two*cl(m))*fm*p(k)/st
       go to 8
    7  y     = y + (one*sl(m) - two*cl(m))*q(k)*ct
    8  l     = l + 2
       go to 10
    9  x     = x + one*q(k)
       z     = z - (fn + 1.0)*one*p(k)
       l     = l + 1
   10 m     = m + 1
c
c     conversion to coordinate system specified by itype
c
      one   = x
      x     = x*cd +   z*sd
      z     = z*cd - one*sd
      f     = sqrt(x*x + y*y + z*z)
c
      return
c
c     error return if date out of bounds
c
   11 f     = 1.0d8
      write (6,961) date
  961 format (/' This subroutine will not work with a date of',
     1        f9.3,'.  Date must be in the range 1900.0.ge.date',
     2        '.le.2035.0. On return f = 1.0d8., x = y = z = 0.')
      return
      end