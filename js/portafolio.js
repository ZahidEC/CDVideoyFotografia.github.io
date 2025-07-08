// Filtrado de la galería
$(document).ready(function(){
    // Filtro por categoría
    $('.btn-filter').click(function(){
        // Remover activo de todos los botones
        $('.btn-filter').removeClass('active');
        // Añadir activo al botón clickeado
        $(this).addClass('active');
        
        var filterValue = $(this).attr('data-filter');
        
        if(filterValue == 'all') {
            // Mostrar todos los items
            $('.portfolio-item').show();
        } else {
            // Ocultar todos los items
            $('.portfolio-item').hide();
            // Mostrar solo los de la categoría seleccionada
            $('.portfolio-item[data-category="' + filterValue + '"]').show();
        }
    });
    
    // Animación al hacer scroll
    $(window).scroll(function() {
        $('.portfolio-item').each(function(){
            var position = $(this).offset().top;
            var scroll = $(window).scrollTop();
            var windowHeight = $(window).height();
            
            if (scroll > position - windowHeight + 200) {
                $(this).css('opacity', '1');
            }
        });
    });
});