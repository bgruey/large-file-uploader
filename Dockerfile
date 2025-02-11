FROM php:8.2-apache

RUN echo "LogLevel debug" >> /etc/apache2/apache2.conf 
