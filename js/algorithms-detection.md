# Описание алгоритмов в detection.js

face detection (FD) — обнаружение/поиск лица
face recognition — распознавание лица


Основная логика FD выполняется в методе findFace().
Метод основан на принципе: от простого к сложному

##### логика faceVerificationOnFaceArea():
+ Все начинается с использования алгоритма "Треугольник". 
Данныфй метод возвращает целочисленное значение, где 
0 — ничего не обнаружил, 1 — алгоритм обнаружил только глаза, 
2 -  алгоритм обнаружил всё. 

Если не была найдена область face, тогда выполняем поиск пересекаемых областей, 
то есть выполняем стандартный алгоритм поиска глаз, но только на всём кадре. 
После этого выполняем анализ областей, в которых были найдены эти пересечения.
Если вокруг них (в зависимости от размера областей с пересечениями) сконцентрированы 
другие области, в осоебнности ищим другие области с пересечениями (это будет означать, 
что выполняется одно из главных условий при верификации лица), то проверяем
